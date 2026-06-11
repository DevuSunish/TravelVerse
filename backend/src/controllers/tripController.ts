import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

// Helper to map country names to ISO alpha-3 country codes for interactive map synchronization
export function getCountryCode(countryName: string): string {
  const mapping: { [key: string]: string } = {
    'italy': 'ITA', 'france': 'FRA', 'spain': 'ESP', 'japan': 'JPN', 'germany': 'DEU',
    'united states': 'USA', 'usa': 'USA', 'united kingdom': 'GBR', 'uk': 'GBR',
    'canada': 'CAN', 'mexico': 'MEX', 'costa rica': 'CRC', 'peru': 'PER',
    'thailand': 'THA', 'india': 'IND', 'australia': 'AUS', 'brazil': 'BRA',
    'south africa': 'ZAF', 'vietnam': 'VNM', 'china': 'CHN', 'iceland': 'ISL',
    'greece': 'GRC', 'switzerland': 'CHE', 'new zealand': 'NZL', 'egypt': 'EGY',
    'indonesia': 'IDN', 'singapore': 'SGP', 'malaysia': 'MYS', 'netherlands': 'NLD'
  };
  const key = countryName.toLowerCase().trim();
  return mapping[key] || (key.length >= 3 ? key.substring(0, 3).toUpperCase() : 'WLD');
}

export async function getTrips(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const statusParam = req.query.status; // 'past', 'planned', 'wishlist'
    
    let tripsQuery = 'SELECT * FROM trips WHERE user_id = $1';
    const params: any[] = [userId];

    if (statusParam) {
      tripsQuery += ' AND status = $2';
      params.push(statusParam);
    }
    
    tripsQuery += ' ORDER BY start_date DESC, created_at DESC';
    const trips = await query(tripsQuery, params);

    // Fetch photos for each trip
    for (const trip of trips) {
      const photos = await query('SELECT * FROM trip_photos WHERE trip_id = $1', [trip.id]);
      trip.photos = photos;
    }

    res.json({ trips });
  } catch (err: any) {
    console.error('Get trips error:', err.message);
    res.status(500).json({ message: 'Server error retrieving trips' });
  }
}

export async function getTripById(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const trips = await query('SELECT * FROM trips WHERE id = $1', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = trips[0];
    
    // Fetch photos, itineraries, activities, expenses
    const photos = await query('SELECT * FROM trip_photos WHERE trip_id = $1', [id]);
    const itineraries = await query('SELECT * FROM itineraries WHERE trip_id = $1 ORDER BY day_number ASC', [id]);
    const activities = await query('SELECT * FROM activities WHERE trip_id = $1 ORDER BY start_time ASC', [id]);
    const expenses = await query('SELECT * FROM expenses WHERE trip_id = $1 ORDER BY created_at DESC', [id]);

    trip.photos = photos;
    trip.itineraries = itineraries;
    trip.activities = activities;
    trip.expenses = expenses;

    res.json({ trip });
  } catch (err: any) {
    console.error('Get trip by ID error:', err.message);
    res.status(500).json({ message: 'Server error retrieving trip details' });
  }
}

export async function createTrip(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { title, country, city, start_date, end_date, description, status, cover_image, budget } = req.body;

    if (!title || !country) {
      return res.status(400).json({ message: 'Title and Country are required' });
    }

    const defaultImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200';
    
    // Insert trip
    const trips = await query(
      `INSERT INTO trips (user_id, title, country, city, start_date, end_date, description, status, cover_image, budget)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        userId,
        title,
        country,
        city || '',
        start_date || null,
        end_date || null,
        description || '',
        status || 'past',
        cover_image || defaultImage,
        budget || 0.00
      ]
    );

    const trip = trips[0];

    // Synchronize to countries_visited table automatically
    const countryCode = getCountryCode(country);
    const mappedStatus = status === 'past' ? 'visited' : (status === 'planned' ? 'planned' : 'wishlist');
    
    try {
      await query(
        `INSERT INTO countries_visited (user_id, country_code, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, country_code) DO UPDATE SET status = EXCLUDED.status`,
        [userId, countryCode, mappedStatus]
      );
    } catch (dbErr) {
      // In SQLite, UNIQUE constraints might conflict slightly, we can fallback to raw insert or ignore
      // Our initDB helper takes care of parameter mapping, let's write simple fallback check:
      try {
        const exist = await query('SELECT id FROM countries_visited WHERE user_id = $1 AND country_code = $2', [userId, countryCode]);
        if (exist.length > 0) {
          await query('UPDATE countries_visited SET status = $1 WHERE user_id = $2 AND country_code = $3', [mappedStatus, userId, countryCode]);
        } else {
          await query('INSERT INTO countries_visited (user_id, country_code, status) VALUES ($1, $2, $3)', [userId, countryCode, mappedStatus]);
        }
      } catch (err) {
        console.error('Map syncing failed:', err);
      }
    }

    // Generate blank daily itineraries if dates are provided
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      const timeDiff = end.getTime() - start.getTime();
      const dayCount = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      if (dayCount > 0 && dayCount <= 30) {
        for (let i = 1; i <= dayCount; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + (i - 1));
          const dateStr = currentDate.toISOString().split('T')[0];
          
          await query(
            'INSERT INTO itineraries (trip_id, day_number, date, notes) VALUES ($1, $2, $3, $4)',
            [trip.id, i, dateStr, `Day ${i} plans...`]
          );
        }
      }
    }

    res.status(201).json({ trip });
  } catch (err: any) {
    console.error('Create trip error:', err.message);
    res.status(500).json({ message: 'Server error creating trip' });
  }
}

export async function updateTrip(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, country, city, start_date, end_date, description, status, cover_image, budget } = req.body;

    const exist = await query('SELECT 1 FROM trips WHERE id = $1 AND user_id = $2', [id, userId]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }

    const updated = await query(
      `UPDATE trips 
       SET title = $1, country = $2, city = $3, start_date = $4, end_date = $5, 
           description = $6, status = $7, cover_image = $8, budget = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [title, country, city, start_date, end_date, description, status, cover_image, budget, id]
    );

    res.json({ trip: updated[0] });
  } catch (err: any) {
    console.error('Update trip error:', err.message);
    res.status(500).json({ message: 'Server error updating trip' });
  }
}

export async function deleteTrip(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const exist = await query('SELECT 1 FROM trips WHERE id = $1 AND user_id = $2', [id, userId]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }

    await query('DELETE FROM trips WHERE id = $1', [id]);
    res.json({ message: 'Trip deleted successfully' });
  } catch (err: any) {
    console.error('Delete trip error:', err.message);
    res.status(500).json({ message: 'Server error deleting trip' });
  }
}

export async function addTripPhotos(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { trip_id, photo_url, caption } = req.body;

    const exist = await query('SELECT 1 FROM trips WHERE id = $1 AND user_id = $2', [trip_id, userId]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }

    const photo = await query(
      'INSERT INTO trip_photos (trip_id, photo_url, caption) VALUES ($1, $2, $3) RETURNING *',
      [trip_id, photo_url, caption || '']
    );

    res.status(201).json({ photo: photo[0] });
  } catch (err: any) {
    console.error('Add trip photo error:', err.message);
    res.status(500).json({ message: 'Server error adding photo' });
  }
}

export async function getItineraries(req: AuthRequest, res: Response) {
  try {
    const { tripId } = req.params;
    const itineraries = await query('SELECT * FROM itineraries WHERE trip_id = $1 ORDER BY day_number ASC', [tripId]);
    res.json({ itineraries });
  } catch (err: any) {
    console.error('Get itineraries error:', err.message);
    res.status(500).json({ message: 'Server error retrieving itineraries' });
  }
}

export async function createOrUpdateItinerary(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { trip_id, day_number, date, notes } = req.body;

    // Check auth
    const exist = await query('SELECT 1 FROM trips WHERE id = $1 AND user_id = $2', [trip_id, userId]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }

    // Try checking if it exists
    const existing = await query('SELECT id FROM itineraries WHERE trip_id = $1 AND day_number = $2', [trip_id, day_number]);
    let itinerary;
    if (existing.length > 0) {
      itinerary = await query(
        'UPDATE itineraries SET date = $1, notes = $2 WHERE trip_id = $3 AND day_number = $4 RETURNING *',
        [date, notes, trip_id, day_number]
      );
    } else {
      itinerary = await query(
        'INSERT INTO itineraries (trip_id, day_number, date, notes) VALUES ($1, $2, $3, $4) RETURNING *',
        [trip_id, day_number, date, notes]
      );
    }

    res.json({ itinerary: itinerary[0] });
  } catch (err: any) {
    console.error('Save itinerary error:', err.message);
    res.status(500).json({ message: 'Server error saving itinerary' });
  }
}

export async function createActivity(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { trip_id, title, description, start_time, end_time, cost } = req.body;

    const exist = await query('SELECT 1 FROM trips WHERE id = $1 AND user_id = $2', [trip_id, userId]);
    if (exist.length === 0) {
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }

    const activity = await query(
      `INSERT INTO activities (trip_id, title, description, start_time, end_time, cost)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [trip_id, title, description || '', start_time || null, end_time || null, cost || 0.00]
    );

    res.status(201).json({ activity: activity[0] });
  } catch (err: any) {
    console.error('Create activity error:', err.message);
    res.status(500).json({ message: 'Server error creating activity' });
  }
}
