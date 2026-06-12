"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateItinerary = generateItinerary;
exports.askAssistant = askAssistant;
const generative_ai_1 = require("@google/generative-ai");
// Helper to generate realistic, beautiful mock data if no Gemini key is provided
function generateMockItinerary(destination, days, budget, interests) {
    const interestList = interests.join(', ') || 'general sightseeing';
    const plan = [];
    // Custom mock points based on destination
    const dest = destination.trim().toLowerCase();
    let attractions = ['Main City Square', 'Historic Old Town', 'Local Food Market', 'Art & History Museum', 'Panoramic City Viewpoint'];
    let foods = ['Traditional local specialty', 'Signature street food dessert', 'Classic regional breakfast platter'];
    if (dest.includes('tokyo') || dest.includes('japan')) {
        attractions = ['Shibuya Crossing & Hachiko', 'Senso-ji Temple in Asakusa', 'Meiji Jingu Shrine & Harajuku', 'TeamLab Planets Digital Art', 'Mount Fuji Day Trip'];
        foods = ['Tonkotsu Ramen', 'Fresh Sushi at Tsukiji Outer Market', 'Yakitori in Omoide Yokocho', 'Matcha Parfait'];
    }
    else if (dest.includes('paris') || dest.includes('france')) {
        attractions = ['Eiffel Tower & Champ de Mars', 'Louvre Museum', 'Montmartre & Sacre-Coeur', 'Palace of Versailles', 'Seine River Night Cruise'];
        foods = ['Warm Butter Croissants', 'Escargot with garlic butter', 'Duck Confit', 'Colorful Macarons'];
    }
    else if (dest.includes('rome') || dest.includes('italy')) {
        attractions = ['The Colosseum & Roman Forum', 'Vatican Museums & Sistine Chapel', 'Trevi Fountain & Spanish Steps', 'Pantheon', 'Trastevere district walk'];
        foods = ['Cacio e Pepe pasta', 'Wood-fired Roman Pizza', 'Creamy Gelato', 'Espresso Macchiato'];
    }
    else if (dest.includes('london') || dest.includes('uk') || dest.includes('united kingdom')) {
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
async function generateItinerary(req, res) {
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
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
        }
        catch (parseErr) {
            console.error('Failed to parse Gemini JSON output. Raw text:', responseText);
            // Fallback to mock if API returns malformed JSON
            const mockResult = generateMockItinerary(destination, parseInt(days), budget || 'medium', interests || []);
            res.json(mockResult);
        }
    }
    catch (err) {
        console.error('Gemini itinerary generation failed:', err.message || err);
        // Silent fallback so user is not blocked
        const { destination, budget, days, interests } = req.body;
        const mockResult = generateMockItinerary(destination, parseInt(days) || 3, budget || 'medium', interests || []);
        res.json(mockResult);
    }
}
async function askAssistant(req, res) {
    try {
        const { question, context, history } = req.body; // history is an array of previous messages
        if (!question) {
            return res.status(400).json({ message: 'Question is required' });
        }
        const apiKey = process.env.GEMINI_API_KEY;
        // Check if the query is travel-related
        const travelKeywords = [
            'travel', 'trip', 'visit', 'flight', 'hotel', 'map', 'packing', 'custom',
            'safety', 'safe', 'budget', 'food', 'eat', 'restaurant', 'weather', 'season',
            'passport', 'visa', 'transit', 'train', 'bus', 'metro', 'airport', 'ticket',
            'luggage', 'baggage', 'explore', 'guide', 'attraction', 'currency', 'money',
            'cost', 'price', 'booking', 'insurance', 'rome', 'italy', 'tokyo', 'japan',
            'paris', 'france', 'london', 'uk', 'united kingdom'
        ];
        const qLower = question.toLowerCase();
        const isTravelRelated = travelKeywords.some(keyword => qLower.includes(keyword));
        if (!isTravelRelated) {
            return res.json({
                answer: `I am your TravelVerse Concierge, specialized in global travel planning, local insights, safety guidelines, and culinary recommendations. How can I help you with your next adventure?`,
                isMock: true
            });
        }
        if (!apiKey) {
            console.warn('GEMINI_API_KEY not found. Returning helpful template-based travel assistant response.');
            // Determine the active topic from current question or conversation history
            let activeTopic = '';
            if (qLower.includes('rome') || qLower.includes('italy'))
                activeTopic = 'Rome';
            else if (qLower.includes('tokyo') || qLower.includes('japan'))
                activeTopic = 'Tokyo';
            else if (qLower.includes('paris') || qLower.includes('france'))
                activeTopic = 'Paris';
            else if (qLower.includes('london') || qLower.includes('uk') || qLower.includes('united kingdom'))
                activeTopic = 'London';
            // If not in current question, look back at history
            if (!activeTopic && Array.isArray(history)) {
                for (let i = history.length - 1; i >= 0; i--) {
                    const txt = history[i].text?.toLowerCase() || '';
                    if (txt.includes('rome') || txt.includes('italy')) {
                        activeTopic = 'Rome';
                        break;
                    }
                    if (txt.includes('tokyo') || txt.includes('japan')) {
                        activeTopic = 'Tokyo';
                        break;
                    }
                    if (txt.includes('paris') || txt.includes('france')) {
                        activeTopic = 'Paris';
                        break;
                    }
                    if (txt.includes('london') || txt.includes('uk') || txt.includes('united kingdom')) {
                        activeTopic = 'London';
                        break;
                    }
                }
            }
            // Default fallback responses
            let answer = `### Global Travel Tips 🌍

Here are some top travel tips from TravelVerse:
* **Plan Transit in Advance**: Research regional rail passes or subway cards to save up to 40% on fares.
* **Safety First**: Keep digital copies of your passport and visa stored securely in your cloud email.
* **Eat Local**: Look for busy restaurants 2-3 blocks away from main tourist spots to find authentic, cheap food.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
            if (qLower.includes('safety') || qLower.includes('safe')) {
                if (activeTopic === 'Rome') {
                    answer = `### 🔒 Safety in Rome, Italy
When visiting Rome, keep these safety guidelines in mind:
* **Watch out for Pickpockets**: Be extremely alert at crowded metro stations (Termini, Colosseo), Termini Station, and tourist spots like the Trevi Fountain.
* **Bag Safety**: Keep bags zipped and hold them in front of you. Never leave your phone on the restaurant tables.
* **Emergency Info**: The general European emergency number is **112**. Keep your embassy phone number handy.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else if (activeTopic === 'Tokyo') {
                    answer = `### 🔒 Safety in Tokyo, Japan
Tokyo is consistently ranked as one of the safest cities in the world:
* **Lost Items**: If you lose something in a metro station or taxi, check the local Koban (police box). Items are returned almost 95% of the time.
* **Earthquake Prep**: Familiarize yourself with emergency exits at your hotel.
* **Emergency Info**: Call **110** for police and **119** for ambulance/fire.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else {
                    answer = `### 🔒 Global Safety Guidelines
When traveling, safety is paramount. Keep these guidelines in mind:
* **Stay Alert in Crowds**: Pickpocketing is common in major transit hubs and landmarks.
* **Travel Insurance**: Get comprehensive coverage including health and cancellation protection.
* **Emergency Contacts**: Save local emergency numbers (e.g., 112 in EU, 911 in US) and your embassy coordinates.
* **Night Transit**: Prefer registered taxi services or ride-hailing apps over walking alone in unfamiliar neighborhoods.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
            }
            else if (qLower.includes('transport') || qLower.includes('bus') || qLower.includes('train') || qLower.includes('metro') || qLower.includes('airport') || qLower.includes('get there')) {
                if (activeTopic === 'Rome') {
                    answer = `### 🚇 Transit & Airport Guide for Rome
Getting around Rome is easy once you know the routes:
* **Airport Transfer**: Take the **Leonardo Express** train from Fiumicino Airport (FCO) directly to Termini Station. It takes 32 minutes and costs €14.
* **Metro & Bus**: Rome has Metro lines A and B. Buy a single €1.50 ticket (valid for 100 minutes) or a 24h/48h pass. You must validate tickets before boarding buses.
* **Walking**: Rome is best explored on foot. Wear comfortable sneakers!

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else if (activeTopic === 'Tokyo') {
                    answer = `### 🚇 Transit & Airport Guide for Tokyo
Tokyo has one of the world's most advanced transit networks:
* **Airport Transfer**:
  * **Narita (NRT)**: Use the **JR Narita Express (N'EX)** to Tokyo/Shibuya/Shinjuku (approx. 60 mins) or the **Keisei Skyliner** to Ueno.
  * **Haneda (HND)**: Take the **Tokyo Monorail** or the **Keikyu Airport Line** (approx. 15-20 mins).
* **IC Cards**: Purchase a digital **Suica** or **Pasmo** card for your phone. You can tap it to ride all trains, subway lines, and buses.
* **Metro Passes**: Look into the Tokyo Subway Ticket (24h/48h/72h options) for unlimited rides on Tokyo Metro & Toei Subway.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else if (activeTopic === 'Paris') {
                    answer = `### 🚇 Transit & Airport Guide for Paris
Paris has an excellent public transport system:
* **Airport Transfer**: From Charles de Gaulle (CDG), take the **RER B** train directly to Gare du Nord or Châtelet (€11.80).
* **Metro**: Paris has 14 metro lines. You can tap your phone or credit card on the Navigo Easy pass to ride.
* **Train Pass**: If staying for a full calendar week, a Navigo Weekly Pass offers unlimited travel.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else {
                    answer = `### 🚇 Global Transportation Guidelines
Navigating a new city can be simple with these guidelines:
* **Transit Cards**: Use contactless payment or smartcards (like London's Oyster, Tokyo's Suica, Paris's Navigo) for discounted rates.
* **High-Speed Rail**: Book tickets 2-4 weeks in advance for intercity routes (e.g. Shinkansen in Japan, TGV in France) to save up to 50%.
* **Offline Maps**: Download Google Maps or Maps.me offline maps before leaving your hotel to navigate without cellular data.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
            }
            else if (qLower.includes('season') || qLower.includes('weather') || qLower.includes('when to visit') || qLower.includes('best time')) {
                if (activeTopic === 'Rome') {
                    answer = `### ☀️ Best Time to Visit Rome
* **Shoulder Season (April-May & September-October)**: Mild weather, gorgeous sunsets, and moderate crowds. Perfect for sightseeing.
* **Summer (June-August)**: Extremely hot (often over 35°C/95°F) with massive tourist crowds.
* **Winter (November-March)**: Cooler and wetter, but hotels are cheap and landmarks have no queues.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else if (activeTopic === 'Tokyo') {
                    answer = `### 🌸 Best Time to Visit Tokyo
* **Spring (March-May)**: Famous cherry blossom season (Sakura). Beautiful mild weather, though prices and crowds peak in early April.
* **Autumn (September-November)**: Staggering red maple leaf foliage (Koyo), clear skies, and comfortable hiking weather.
* **Summer (June-August)**: Hot, humid, and rainy (rainy season in June), but great for summer festivals and fireworks.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else {
                    answer = `### 📅 Selecting the Right Travel Season
* **Shoulder Season**: The absolute best value (spring or autumn). Offers lower prices, mild weather, and fewer crowds.
* **High Season**: Perfect weather but peak prices and long lines. Requires booking flights and lodging months in advance.
* **Low Season**: Great for budget travelers, but check for winter closures or rainy seasons depending on the destination.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
            }
            else if (qLower.includes('food') || qLower.includes('eat') || qLower.includes('restaurant') || qLower.includes('dish')) {
                if (activeTopic === 'Rome') {
                    answer = `### 🍝 Roman Food Specialties
Rome is a paradise for food lovers:
* **The Four Roman Pastas**: Try **Cacio e Pepe** (cheese and pepper), **Carbonara** (egg, guanciale, pecorino), **Amatriciana** (tomato, guanciale), and **Gricia**.
* **Pizza al Taglio**: Pizza sold by weight. A perfect, quick street food lunch.
* **Gelato**: Seek out artisanal gelaterias like *Frigidarium* or *Giolitti*. Avoid bright neon-colored mounds!

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else if (activeTopic === 'Tokyo') {
                    answer = `### 🍣 Tokyo Culinary Highlights
Tokyo is the culinary capital of the world with incredible variety:
* **Ramen**: Visit **Ichiran Ramen Shibuya** or **Tsuta** for delicious tonkotsu or shoyu broth.
* **Sushi**: Grab fresh sushi at the **Tsukiji Outer Market** early in the morning.
* **Yakitori**: Head to **Omoide Yokocho** (Memory Lane) in Shinjuku for charcoal-grilled skewers under paper lanterns.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
                else {
                    answer = `### 🍽️ Culinary Travel Guidelines
* **Follow the Locals**: Look for busy restaurants 2-3 blocks away from main tourist spots.
* **Street Food**: Try local street food night markets (e.g. in Bangkok or Taipei) for the most authentic and cheap dining.
* **Reservations**: For highly rated bistros, book table reservations at least 1-2 weeks in view.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
                }
            }
            else if (qLower.includes('currency') || qLower.includes('money') || qLower.includes('cost') || qLower.includes('price')) {
                answer = `### 💵 Travel Currency & Money Guidelines
Keep these money tips in mind for a smooth journey:
* **Carry Some Local Cash**: While cards are widely accepted worldwide, small shops, street markets, and public transit terminals often require physical cash (especially in parts of Germany, Japan, and Italy).
* **Avoid Airport Currency Desks**: They offer some of the worst exchange rates. Use local bank ATMs at your destination instead for fairer rates.
* **Credit Card Fees**: Make sure you use a card with zero foreign transaction fees to save on every tap. Always select payment in local currency (rather than home currency) if asked on ATM/POS machines.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
            }
            else if (qLower.includes('visa') || qLower.includes('passport')) {
                answer = `### 🛂 Passport & Visa Requirements
Preparing travel documentation is crucial:
* **6-Month Passport Rule**: Many countries require your passport to be valid for at least 6 months beyond your entry or planned departure date.
* **Visa Checks**: Always double-check visa requirements for your nationality via the official embassy portal of your destination country.
* **Digital Backups**: Email scanned copies of your passport page, visa, and insurance policy to yourself so they are accessible on any device.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
            }
            else if (qLower.includes('packing') || qLower.includes('pack') || qLower.includes('luggage') || qLower.includes('baggage')) {
                answer = `### 🧳 Smart Packing Checklist
A light load makes traveling significantly easier:
* **Universal Adapter**: Pack a multi-plug universal travel adapter that supports multiple USB ports.
* **Versatile Layers**: Pack clothing items that can easily be mixed and matched. Layering is key for changing weather.
* **Footwear**: Bring one pair of worn-in, comfortable walking sneakers. Active travel easily tops 15,000 steps a day.
* **Personal Medicine & Toiletries**: Carry prescription drugs and a small basic first-aid kit in your carry-on bag.

*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
            }
            else if (activeTopic) {
                answer = `### ✈️ Exploring ${activeTopic}
You are asking about **${activeTopic}**. Here are some helpful highlights:
* **Top Attraction**: Visit the historic landmarks. In Rome, see the *Colosseum*. In Tokyo, explore *Shibuya Crossing*.
* **Local Etiquette**:
  * In Italy, cover shoulders when entering churches; do not order cappuccino after 11 AM.
  * In Japan, do not tip; stand on the left side of escalators; keep voice low on public transit.
  
*Note: I am currently running in Offline Demo Mode. For live, personalized travel recommendations from my AI core, please connect TravelVerse to the internet.*`;
            }
            return res.json({ answer, isMock: true });
        }
        // Real Gemini integration
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // Build system instruction
        const systemInstruction = `You are TravelVerse's AI Travel Assistant, a highly helpful, charismatic, and knowledgeable global travel concierge. 
    Answer the user's travel question clearly, structuring your response with beautiful Markdown headings, bullet points, and bold text. 
    Keep your recommendations practical, addressing safety tips, food, culture, transit, or packing where relevant.
    
    Current Travel Context: ${context || 'General travel help'}`;
        // Format chat history for Gemini SDK (strictly alternating starting with user)
        const formattedHistory = [];
        if (Array.isArray(history) && history.length > 0) {
            const firstUserIdx = history.findIndex(h => h.sender === 'user');
            // Exclude the last message since it represents the current question
            const historyToFormat = firstUserIdx !== -1 ? history.slice(firstUserIdx, -1) : [];
            let lastRole = null;
            historyToFormat.forEach((msg) => {
                const role = msg.sender === 'user' ? 'user' : 'model';
                if (role !== lastRole) {
                    formattedHistory.push({
                        role,
                        parts: [{ text: msg.text }]
                    });
                    lastRole = role;
                }
            });
        }
        // Build and send to chat session
        const chat = model.startChat({
            history: formattedHistory,
            systemInstruction: systemInstruction,
        });
        const result = await chat.sendMessage(question);
        res.json({ answer: result.response.text(), isMock: false });
    }
    catch (err) {
        console.error('Gemini assistant error:', err.message || err);
        res.status(500).json({ answer: 'I apologize, but I encountered an error connecting to my AI core. Please try again shortly or configure a valid API key in the backend environment.', isError: true });
    }
}
