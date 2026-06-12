import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { notifyGroupMembers } from '../services/notificationService';

export async function addExpense(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { trip_id, group_id, amount, description, category, split_details } = req.body;

    if (!amount || !description || !category) {
      return res.status(400).json({ message: 'Amount, description, and category are required' });
    }

    // Verify trip ownership if it's a personal trip
    if (trip_id && !group_id) {
      const tripCheck = await query('SELECT 1 FROM trips WHERE id = $1 AND user_id = $2', [trip_id, userId]);
      if (tripCheck.length === 0) {
        return res.status(403).json({ message: 'Unauthorized to add expenses to this trip' });
      }
    }

    // Verify group membership if it's a group trip
    if (group_id) {
      const groupCheck = await query(
        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'',
        [group_id, userId]
      );
      if (groupCheck.length === 0) {
        return res.status(403).json({ message: 'Unauthorized to add expenses to this group' });
      }
    }

    // Insert expense
    const newExpense = await query(
      `INSERT INTO expenses (trip_id, group_id, paid_by_user_id, amount, description, category, split_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        trip_id || null,
        group_id || null,
        userId,
        amount,
        description,
        category,
        split_details ? JSON.stringify(split_details) : null
      ]
    );

    if (group_id) {
      const payer = await query('SELECT username FROM users WHERE id = $1', [userId]);
      const payerUsername = payer[0]?.username || 'A group member';
      notifyGroupMembers(
        group_id,
        userId,
        `${payerUsername} logged a new expense "${description}" for $${amount}.`,
        { expense_id: newExpense[0].id, amount, description }
      ).catch(err => console.error('Failed to notify group members for expense:', err.message));
    }

    res.status(201).json({ expense: newExpense[0] });
  } catch (err: any) {
    console.error('Add expense error:', err.message);
    res.status(500).json({ message: 'Server error adding expense' });
  }
}

export async function getExpenses(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { trip_id, group_id } = req.query;

    if (!trip_id && !group_id) {
      return res.status(400).json({ message: 'Please provide either trip_id or group_id' });
    }

    let expenses: any[] = [];
    let budget = 0;

    if (group_id) {
      // Get group details
      const groupCheck = await query(
        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'',
        [group_id, userId]
      );
      if (groupCheck.length === 0) {
        return res.status(403).json({ message: 'Unauthorized to view these expenses' });
      }

      expenses = await query(
        `SELECT e.*, u.username as paid_by_username 
         FROM expenses e
         JOIN users u ON e.paid_by_user_id = u.id
         WHERE e.group_id = $1 ORDER BY e.created_at DESC`,
        [group_id]
      );
    } else {
      // Personal trip expenses
      const tripCheck = await query('SELECT budget FROM trips WHERE id = $1 AND user_id = $2', [trip_id, userId]);
      if (tripCheck.length === 0) {
        return res.status(403).json({ message: 'Unauthorized to view these expenses' });
      }
      budget = parseFloat(tripCheck[0].budget || '0');

      expenses = await query(
        `SELECT e.*, u.username as paid_by_username 
         FROM expenses e
         JOIN users u ON e.paid_by_user_id = u.id
         WHERE e.trip_id = $1 ORDER BY e.created_at DESC`,
        [trip_id]
      );
    }

    // Compute metrics
    let totalSpent = 0;
    const categoryBreakdown: { [key: string]: number } = {};

    expenses.forEach((exp) => {
      const amt = parseFloat(exp.amount || '0');
      totalSpent += amt;
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + amt;
    });

    // Share computations if group expenses
    let balances: { [username: string]: number } = {};
    if (group_id) {
      // Find all members in the group
      const members = await query(
        `SELECT u.id, u.username 
         FROM users u
         JOIN group_members m ON u.id = m.user_id
         WHERE m.group_id = $1 AND m.status = 'accepted'`,
        [group_id]
      );

      // Initialize balances
      members.forEach((m) => {
        balances[m.username] = 0;
      });

      // Split computations: each expense is split equally among all members if split_details is not custom
      expenses.forEach((exp) => {
        const amt = parseFloat(exp.amount || '0');
        const payer = exp.paid_by_username;
        
        let splitArr: { userId: number; username: string; share: number }[] = [];
        if (exp.split_details) {
          try {
            splitArr = typeof exp.split_details === 'string' ? JSON.parse(exp.split_details) : exp.split_details;
          } catch (e) {
            splitArr = [];
          }
        }

        if (splitArr.length > 0) {
          // Custom split
          splitArr.forEach((split) => {
            if (balances[split.username] !== undefined) {
              if (split.username === payer) {
                balances[payer] += (amt - split.share);
              } else {
                balances[split.username] -= split.share;
              }
            }
          });
        } else {
          // Equal split
          const share = amt / members.length;
          members.forEach((m) => {
            if (m.username === payer) {
              balances[payer] += (amt - share);
            } else {
              balances[m.username] -= share;
            }
          });
        }
      });
    }

    res.json({
      expenses,
      budget,
      totalSpent,
      categoryBreakdown,
      balances: group_id ? Object.keys(balances).map(key => ({ username: key, balance: parseFloat(balances[key].toFixed(2)) })) : null
    });
  } catch (err: any) {
    console.error('Get expenses error:', err.message);
    res.status(500).json({ message: 'Server error retrieving expenses' });
  }
}

export async function deleteExpense(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const exist = await query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = exist[0];

    // Check authorization: must be the one who paid, or trip owner, or group admin
    if (expense.paid_by_user_id !== userId) {
      if (expense.trip_id) {
        const tripCheck = await query('SELECT 1 FROM trips WHERE id = $1 AND user_id = $2', [expense.trip_id, userId]);
        if (tripCheck.length === 0) {
          return res.status(403).json({ message: 'Unauthorized to delete this expense' });
        }
      } else if (expense.group_id) {
        const groupAdminCheck = await query(
          'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = \'admin\'',
          [expense.group_id, userId]
        );
        if (groupAdminCheck.length === 0) {
          return res.status(403).json({ message: 'Unauthorized to delete this expense' });
        }
      }
    }

    await query('DELETE FROM expenses WHERE id = $1', [id]);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err: any) {
    console.error('Delete expense error:', err.message);
    res.status(500).json({ message: 'Server error deleting expense' });
  }
}
