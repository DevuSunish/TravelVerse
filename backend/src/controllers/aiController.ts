import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthRequest } from '../middleware/auth';

// Helper to generate realistic, beautiful mock data if no Gemini key is provided
function generateMockItinerary(destination: string, days: number, budget: string, interests: string[]) {
  const interestList = interests.join(', ') || 'general sightseeing';
  const plan = [];
  
  // Custom mock points based on destination
  const dest = destination.trim().toLowerCase();
  let attractions = ['Main City Square', 'Historic Old Town', 'Local Food Market', 'Art & History Museum', 'Panoramic City Viewpoint'];
  let foods = ['Traditional local specialty', 'Signature street food dessert', 'Classic regional breakfast platter'];
  
  if (dest.includes('tokyo') || dest.includes('japan')) {
    attractions = ['Shibuya Crossing & Hachiko', 'Senso-ji Temple in Asakusa', 'Meiji Jingu Shrine & Harajuku', 'TeamLab Planets Digital Art', 'Mount Fuji Day Trip'];
    foods = ['Tonkotsu Ramen', 'Fresh Sushi at Tsukiji Outer Market', 'Yakitori in Omoide Yokocho', 'Matcha Parfait'];
  } else if (dest.includes('paris') || dest.includes('france')) {
    attractions = ['Eiffel Tower & Champ de Mars', 'Louvre Museum', 'Montmartre & Sacre-Coeur', 'Palace of Versailles', 'Seine River Night Cruise'];
    foods = ['Warm Butter Croissants', 'Escargot with garlic butter', 'Duck Confit', 'Colorful Macarons'];
  } else if (dest.includes('rome') || dest.includes('italy')) {
    attractions = ['The Colosseum & Roman Forum', 'Vatican Museums & Sistine Chapel', 'Trevi Fountain & Spanish Steps', 'Pantheon', 'Trastevere district walk'];
    foods = ['Cacio e Pepe pasta', 'Wood-fired Roman Pizza', 'Creamy Gelato', 'Espresso Macchiato'];
  } else if (dest.includes('london') || dest.includes('uk') || dest.includes('united kingdom')) {
    attractions = ['British Museum', 'Tower of London & Tower Bridge', 'London Eye & Westminster Abbey', 'Hyde Park & Kensington Palace', 'Borough Market'];
    foods = ['Fish and Chips with mushy peas', 'Full English Breakfast', 'Sunday Roast with Yorkshire pudding', 'Scones with clotted cream'];
  }

  // Build day-wise structure
  for (let i = 1; i <= days; i++) {
    const dayAttraction1 = attractions[(i - 1) % attractions.length];
    const dayAttraction2 = attractions[i % attractions.length];
    const dayFood = foods[(i - 1) % foods.length];
    
    plan.push({
      day: i,
      title: `Exploring the best of ${destination} - Day ${i}`,
      activities: [
        {
          time: '09:00 AM',
          title: `Morning visit to ${dayAttraction1}`,
          description: `Arrive early to beat the crowds. Excellent photo opportunities and historical guides available. (Interest focus: ${interestList})`
        },
        {
          time: '01:00 PM',
          title: `Lunch & Culinary Tour`,
          description: `Stop by a highly-rated local bistro to try the famous ${dayFood}. Clean palate and high ratings.`
        },
        {
          time: '03:30 PM',
          title: `Afternoon stroll through ${dayAttraction2}`,
          description: `Discover secret alleys and browse local boutique shops. Great souvenir shopping nearby.`
        },
        {
          time: '07:30 PM',
          title: `Dinner & Evening Entertainment`,
          description: `Relax with local music and savor local beverages. Unwind from a full day of traveling.`
        }
      ]
    });
  }

  // Cost estimates based on budget tier
  const costPerDay = budget === 'low' ? 45 : (budget === 'medium' ? 120 : 350);
  const totalCost = costPerDay * days;

  return {
    isMock: true,
    destination,
    days,
    budgetTier: budget,
    estimatedCost: {
      currency: 'USD',
      total: totalCost,
      breakdown: {
        accommodation: totalCost * 0.45,
        food: totalCost * 0.25,
        activities: totalCost * 0.18,
        transport: totalCost * 0.12
      }
    },
    itinerary: plan,
    tips: [
      `Since you selected ${budget} budget, we suggest buying a weekly public transit pass immediately upon arrival.`,
      `For interests in ${interestList}, book tickets to museums/parks at least 48 hours in advance.`,
      `Tipping customs: check local restaurants, as standard service charges are often included in this region.`
    ]
  };
}

export async function generateItinerary(req: AuthRequest, res: Response) {
  try {
    const { destination, budget, days, interests } = req.body;

    if (!destination || !days) {
      return res.status(400).json({ message: 'Destination and number of days are required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found. Returning structured mock itinerary.');
      const mockResult = generateMockItinerary(destination, parseInt(days), budget || 'medium', interests || []);
      return res.json(mockResult);
    }

    // Real Gemini integration
    const genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-1.5-flash model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are a professional travel planner and concierge AI. Generate a detailed, highly accurate, and engaging day-wise travel itinerary for:
      Destination: ${destination}
      Duration: ${days} days
      Budget level: ${budget || 'medium'} (options: low, medium, high)
      Interests/Themes: ${interests?.join(', ') || 'general sightseeing'}

      You MUST respond ONLY with a valid JSON object matching the following structure (do not write any markdown code blocks, do not write anything else outside the JSON object):
      {
        "destination": "${destination}",
        "days": ${days},
        "budgetTier": "${budget || 'medium'}",
        "estimatedCost": {
          "currency": "USD",
          "total": number,
          "breakdown": {
            "accommodation": number,
            "food": number,
            "activities": number,
            "transport": number
          }
        },
        "itinerary": [
          {
            "day": number,
            "title": "Day title",
            "activities": [
              {
                "time": "HH:MM AM/PM",
                "title": "Activity name",
                "description": "Short description of what to do, local tips, and relevant info"
              }
            ]
          }
        ],
        "tips": [
          "Tip 1",
          "Tip 2",
          "Tip 3"
        ]
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    
    try {
      const parsedJSON = JSON.parse(responseText.trim());
      res.json(parsedJSON);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output. Raw text:', responseText);
      // Fallback to mock if API returns malformed JSON
      const mockResult = generateMockItinerary(destination, parseInt(days), budget || 'medium', interests || []);
      res.json(mockResult);
    }
  } catch (err: any) {
    console.error('Gemini itinerary generation failed:', err.message || err);
    // Silent fallback so user is not blocked
    const { destination, budget, days, interests } = req.body;
    const mockResult = generateMockItinerary(destination, parseInt(days) || 3, budget || 'medium', interests || []);
    res.json(mockResult);
  }
}

export async function askAssistant(req: AuthRequest, res: Response) {
  try {
    const { question, context } = req.body; // context is optional (e.g. past history or destination)

    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found. Returning helpful template-based travel assistant response.');
      
      // Let's generate a smart mock answer based on keywords in the question
      const q = question.toLowerCase();
      let answer = `That is an excellent travel question! Without a live Gemini connection, here are some general tips: \n\n1. **Always plan transit in advance**: Research regional rail passes or subway cards to save up to 40%.\n2. **Safety First**: Make copies of your passport, and store digital copies securely in your email.\n3. **Local Cuisine**: Look for restaurants filled with locals, typically 2-3 blocks away from main tourist spots.\n\nPlease enter your GEMINI_API_KEY in the backend .env file to enable custom, fully intelligent real-time travel AI advice!`;
      
      if (q.includes('safety') || q.includes('safe')) {
        answer = `When traveling, safety is paramount. Here are key guidelines:\n\n- **Stay Alert in Crowds**: Pickpocketing is common in major hubs like train stations and landmarks.\n- **Travel Insurance**: Get comprehensive coverage including health and cancellation protection.\n- **Emergency Numbers**: Save local police/medical numbers (e.g., 112 in EU, 911 in US) and your embassy coordinates.\n- **Night Transit**: Prefer registered taxi services (or apps like Uber/Grab) over walking alone at night in unfamiliar neighborhoods.`;
      } else if (q.includes('transport') || q.includes('bus') || q.includes('train') || q.includes('metro')) {
        answer = `Navigating a new city can be easy with these transportation guidelines:\n\n- **Transit Cards**: Cities like London (Oyster), Tokyo (Suica), and Paris (Navigo) offer integrated tap cards that work across subways, buses, and trains.\n- **High-Speed Rail**: If traveling between cities (e.g., Shinkansen in Japan, TGV in France), booking tickets 2-4 weeks in advance yields major savings.\n- **Walking Maps**: Download Google Maps or Maps.me offline data before leaving your hotel to navigate without roaming data.`;
      } else if (q.includes('season') || q.includes('weather') || q.includes('when to visit') || q.includes('best time')) {
        answer = `Choosing the right travel season makes a huge difference:\n\n- **Shoulder Season**: The absolute best value (spring or autumn). Lower prices, milder weather, and fewer crowds.\n- **High Season (Summer/Holidays)**: Perfect weather but peak prices and long queues. Requires booking flights/lodging months in advance.\n- **Low Season**: Great for budget travel, but expect wetter/colder weather and some attractions to close early.`;
      }

      return res.json({ answer, isMock: true });
    }

    // Real Gemini integration
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `You are TravelVerse's AI Travel Assistant, a highly helpful, charismatic, and knowledgeable global travel concierge. 
    Answer the user's travel question clearly, structuring your response with beautiful Markdown headings and bullet points. 
    Keep your recommendations practical, addressing safety tips, food, culture, transit, or packing where relevant.
    
    Context about current travel: ${context || 'General travel help'}`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${question}` }] }
      ]
    });

    res.json({ answer: result.response.text(), isMock: false });
  } catch (err: any) {
    console.error('Gemini assistant error:', err.message || err);
    res.status(500).json({ answer: 'I apologize, but I encountered an error connecting to my AI core. Please try again shortly or configure a valid API key in the backend environment.', isError: true });
  }
}
