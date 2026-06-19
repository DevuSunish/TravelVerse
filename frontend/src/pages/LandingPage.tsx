import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Compass, Sparkles, Share2, DollarSign, Globe, ArrowRight, 
  Users, MapPin, MessageSquare, Image, Award, Heart, BookOpen, Clock, Plane
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';



// Interactive expandable features data
const features = [
  {
    id: 'logs',
    title: 'Travel Logs',
    icon: BookOpen,
    shortDescription: 'Log budgets, maps & visual stories.',
    detailedDescription: 'Capture every detail of your journey. Catalog visited locations, attach high-res photos, write journal entries, and track travel budgets in organized, beautiful logs.',
    benefits: ['Interactive footprint pinning', 'Category-wise budget breakdown', 'Chronological photo logs'],
    image: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=800',
    ctaText: 'Write Your Logs',
    ctaLink: '/trips'
  },
  {
    id: 'communities',
    title: 'Communities',
    icon: Users,
    shortDescription: 'Connect with destination-based hubs.',
    detailedDescription: 'Find your global travel tribe. Join communities built around specific destinations or travel interests like Annapurna Base Camp, Kerala Backpackers, or Solo Travelers.',
    benefits: ['Destination-specific advice', 'Coordinate group treks', 'Meet locals and nomads'],
    image: 'https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&q=80&w=800',
    ctaText: 'Discover Hubs',
    ctaLink: '/communities'
  },
  {
    id: 'assistant',
    title: 'AI Assistant',
    icon: Sparkles,
    shortDescription: 'Generate Gemini-powered itineraries.',
    detailedDescription: 'Travel planning made intelligent. Simply input your destination, budget tier, and interests, and Google Gemini AI will generate custom day-by-day itineraries instantly.',
    benefits: ['Tailored day-by-day itineraries', 'Gemini AI recommendations', 'Automated packing checklists'],
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
    ctaText: 'Consult Gemini AI',
    ctaLink: '/ai-assistant'
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    icon: Compass,
    shortDescription: 'Discover and share local favorites.',
    detailedDescription: 'Uncover hidden gems cataloged by real travelers. Pin your favorite cafes, viewpoints, and hotels, and follow other globetrotters to view their recommendations.',
    benefits: ['Explore local hidden gems', 'Pin favorite travel coordinates', 'Follow verified explorers'],
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800',
    ctaText: 'Explore Map Pins',
    ctaLink: '/recommendations'
  },
  {
    id: 'planner',
    title: 'Group Planning',
    icon: Share2,
    shortDescription: 'Plan itineraries with friends.',
    detailedDescription: 'Collaborate seamlessly in real-time. Create shared trip plans, compile packing checklists, vote on scheduled activities, and track shared balances.',
    benefits: ['Collaborative group checklists', 'Real-time voting on plans', 'Expense splitter integrations'],
    image: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&q=80&w=800',
    ctaText: 'Start Group Plan',
    ctaLink: '/planner'
  },
  {
    id: 'chats',
    title: 'Chats & Gallery',
    icon: MessageSquare,
    shortDescription: 'Message planners & share media.',
    detailedDescription: 'Communication and memories combined. Talk directly inside direct messages or group chats, and view photos uploaded during your group trips in one media timeline.',
    benefits: ['Instant direct & group messaging', 'Shared timeline photo feeds', 'Unsend message controls'],
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
    ctaText: 'Open Chats',
    ctaLink: '/groups'
  }
];

// Mock data for travel logs showcase
const mockLogs = [
  {
    id: 1,
    title: 'Wandering Kyoto\'s Bamboo Forests',
    author: 'Haruto Sato',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=haruto',
    destination: 'Japan',
    excerpt: 'Finding peace in the early morning paths of Arashiyama. The towering stalks of green rustled in the cool breeze as the first rays of sunlight pierced the canopy.',
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=600',
    likes: 42,
  },
  {
    id: 2,
    title: 'Motorcycling through Ladakh\'s High Passes',
    author: 'Rohan Sharma',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=rohan',
    destination: 'India',
    excerpt: 'Crossing Khardung La at 17,582 feet on two wheels is a dream realized. The thin air, prayer flags snapping in the wind, and endless snow peaks make it an unforgettable ride.',
    cover_image: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&q=80&w=600',
    likes: 87,
  },
  {
    id: 3,
    title: 'A Week in the Amalfi Coast',
    author: 'Sophia Bianchi',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=sophia',
    destination: 'Italy',
    excerpt: 'Sun-drenched cliffs, pastel-colored houses cascading down to the sea, and lemon groves. Walking the Path of the Gods offered views that words simply cannot capture.',
    cover_image: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=80&w=600',
    likes: 64,
  }
];

// Mock data for community discovery grid
const mockDiscoverCommunities = [
  {
    id: 6,
    name: 'Bali Digital Nomads',
    category: 'Workation',
    member_count: 142,
    cover_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 7,
    name: 'Munnar Explorers',
    category: 'Nature',
    member_count: 58,
    cover_image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 8,
    name: 'Paris Art Walkers',
    category: 'Culture',
    member_count: 94,
    cover_image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 9,
    name: 'Iceland Ring Roaders',
    category: 'Roadtrip',
    member_count: 110,
    cover_image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=400',
  }
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isAnimated, setIsAnimated] = useState(false);
  const [isFinalCtaVisible, setIsFinalCtaVisible] = useState(false);
  const [isDiariesVisible, setIsDiariesVisible] = useState(false);
  const [isCommunitiesVisible, setIsCommunitiesVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const finalCtaRef = useRef<HTMLDivElement>(null);
  const diariesRef = useRef<HTMLDivElement>(null);
  const communitiesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsDiariesVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (diariesRef.current) {
      observer.observe(diariesRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsCommunitiesVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (communitiesRef.current) {
      observer.observe(communitiesRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsFinalCtaVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (finalCtaRef.current) {
      observer.observe(finalCtaRef.current);
    }

    return () => observer.disconnect();
  }, []);
  const journeyContainerRef = useRef<HTMLDivElement>(null);
  const leftPathRef = useRef<SVGPathElement>(null);
  const leftMaskRef = useRef<SVGPathElement>(null);
  const leftPlaneRef = useRef<HTMLDivElement>(null);
  const rightPathRef = useRef<SVGPathElement>(null);
  const rightMaskRef = useRef<SVGPathElement>(null);
  const rightPlaneRef = useRef<HTMLDivElement>(null);
  const maxFractionRef = useRef<number>(0);
 
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (
            !journeyContainerRef.current || 
            !leftPathRef.current || 
            !leftMaskRef.current || 
            !leftPlaneRef.current || 
            !rightPathRef.current || 
            !rightMaskRef.current || 
            !rightPlaneRef.current
          ) return;

          const containerRect = journeyContainerRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          // Animates from when journey container top enters view to when it exits the top
          const startScroll = containerRect.top - viewportHeight;
          const endScroll = containerRect.bottom - viewportHeight * 0.2;
          const totalScrollDistance = endScroll - startScroll;

          let fraction = -startScroll / totalScrollDistance;
          fraction = Math.max(0, Math.min(1, fraction)); // clamp between [0, 1]

          // Check if the section has entered the viewport (for fade in opacity control)
          const hasEntered = containerRect.top < viewportHeight;

          // Update max scroll fraction reached so far (one-way progress)
          if (hasEntered && fraction > maxFractionRef.current) {
            maxFractionRef.current = fraction;
          }

          const currentFraction = maxFractionRef.current;

          // Left plane & path trail reveal
          try {
            const path = leftPathRef.current;
            const mask = leftMaskRef.current;
            const plane = leftPlaneRef.current;
            const pathLength = path.getTotalLength();

            mask.style.strokeDasharray = `${pathLength}`;
            mask.style.strokeDashoffset = `${pathLength * (1 - currentFraction)}`;

            const distance = currentFraction * pathLength;
            const point = path.getPointAtLength(distance);

            const sampleDelta = 2;
            const nextDistance = Math.min(distance + sampleDelta, pathLength);
            const nextPoint = path.getPointAtLength(nextDistance);
            const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;

            const pctX = (point.x / 100) * 100;
            const pctY = (point.y / 1200) * 100;

            plane.style.left = `${pctX}%`;
            plane.style.top = `${pctY}%`;
            plane.style.transform = `translate(-50%, -50%) rotate(${angle - 90}deg)`;
            plane.style.opacity = hasEntered ? '1' : '0';
          } catch (e) {}

          // Right plane & path trail reveal
          try {
            const path = rightPathRef.current;
            const mask = rightMaskRef.current;
            const plane = rightPlaneRef.current;
            const pathLength = path.getTotalLength();

            mask.style.strokeDasharray = `${pathLength}`;
            mask.style.strokeDashoffset = `${pathLength * (1 - currentFraction)}`;

            const distance = currentFraction * pathLength;
            const point = path.getPointAtLength(distance);

            const sampleDelta = 2;
            const nextDistance = Math.min(distance + sampleDelta, pathLength);
            const nextPoint = path.getPointAtLength(nextDistance);
            const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;

            const pctX = (point.x / 100) * 100;
            const pctY = (point.y / 1200) * 100;

            plane.style.left = `${pctX}%`;
            plane.style.top = `${pctY}%`;
            plane.style.transform = `translate(-50%, -50%) rotate(${angle - 90}deg)`;
            plane.style.opacity = hasEntered ? '1' : '0';
          } catch (e) {}

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    setTimeout(handleScroll, 100);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, isTablet]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-250 flex flex-col font-sans overflow-x-hidden relative">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center py-24 bg-slate-950 text-white overflow-hidden">
        {/* Full-width Immersive Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1920" 
            alt="Travel background" 
            className="w-full h-full object-cover opacity-50 scale-105 select-none pointer-events-none"
          />
          {/* Multi-layered Premium Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/60 to-slate-950" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest animate-float">
            <Compass className="h-4.5 w-4.5 text-emerald-400 animate-spin-slow" />
            Discover the World with TravelVerse
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-serif tracking-tight leading-[1.1] text-white">
            Share Your Journey.<br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Discover New Adventures.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed font-sans font-medium">
            TravelVerse helps travelers document trips, connect with communities, share recommendations, and plan future adventures. Let Gemini AI design itineraries and track your footprint on an interactive map.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              to={user ? "/" : "/auth"}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 text-sm md:text-base cursor-pointer scale-100 hover:scale-102"
            >
              {user ? 'Go to Dashboard' : 'Start Your Adventure'}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to={user ? "/communities" : "/auth?tab=register"}
              className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 border border-white/20 hover:bg-white/10 hover:border-white/30 text-white font-bold rounded-2xl transition-all duration-300 text-sm md:text-base cursor-pointer"
            >
              Join Community
            </Link>
          </div>
        </div>
      </section>

      <div className="space-y-24 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

        {/* 3. INTERACTIVE OVERLAPPING CARD DECK FEATURE SHOWCASE SECTION */}
        <section ref={sectionRef} className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-emerald-500 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest font-sans">Capabilities Showcase</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">
              An All-in-One Social Ecosystem
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
              Explore the core features powering your TravelVerse experience.
            </p>
          </div>

          {/* GRID CONTAINER */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[500px] relative select-none">
            {features.map((feat, index) => {
              const Icon = feat.icon;

              // Calculate transition styles
              let cardStyle: React.CSSProperties = {};
              
              if (isAnimated) {
                cardStyle = {
                  opacity: 1,
                  transform: 'translate(0, 0) rotate(0deg) scale(1)',
                  transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease-out',
                  transitionDelay: `${index * 120}ms`,
                };
              } else {
                const rotate = (index - 2.5) * 3;
                const offsetX = (index - 2.5) * 8;
                const offsetY = (index - 2.5) * 4;

                let transform = '';
                if (isDesktop) {
                  const c = index % 3;
                  const r = Math.floor(index / 3);
                  const dX = (1 - c) * 100;
                  const dY = (0.5 - r) * 100;
                  transform = `translate(calc(${dX}% + ${offsetX}px), calc(${dY}% + ${offsetY}px)) rotate(${rotate}deg) scale(0.9)`;
                } else if (isTablet) {
                  const c = index % 2;
                  const r = Math.floor(index / 2);
                  const dX = (0.5 - c) * 100;
                  const dY = (1 - r) * 100;
                  transform = `translate(calc(${dX}% + ${offsetX}px), calc(${dY}% + ${offsetY}px)) rotate(${rotate}deg) scale(0.9)`;
                } else {
                  // Mobile
                  const r = index;
                  const dY = (2.5 - r) * 100;
                  transform = `translate(calc(${offsetX}px), calc(${dY}% + ${offsetY}px)) rotate(${rotate}deg) scale(0.9)`;
                }

                cardStyle = {
                  opacity: 0,
                  transform,
                  pointerEvents: 'none',
                };
              }

              return (
                <div
                  key={feat.id}
                  style={cardStyle}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-md flex flex-col justify-between hover-card group"
                >
                  <div>
                    {/* Cover Image */}
                    <div className="relative h-44 w-full overflow-hidden shrink-0">
                      <img 
                        src={feat.image} 
                        alt={feat.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      
                      {/* Icon overlay on the image */}
                      <div className="absolute bottom-4 left-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-wide font-sans">{feat.title}</h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed min-h-[4.5rem]">
                        {feat.detailedDescription}
                      </p>
                      
                      {/* Benefits List */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Key Benefits</span>
                        <ul className="space-y-1.5">
                          {feat.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-350">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Button */}
                  <div className="p-6 pt-0">
                    <Link
                      to={user ? feat.ctaLink : "/auth"}
                      className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-emerald-500/10 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {feat.ctaText}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* WRAPPER FOR DIARIES & POPULAR COMMUNITIES FLIGHT PATH */}
        <div ref={journeyContainerRef} className="relative w-full overflow-visible">
          {/* Left Side Gutter SVG & Plane */}
          <div className="absolute top-0 bottom-0 left-0 w-4 md:w-16 lg:w-24 md:-translate-x-full pointer-events-none z-10 overflow-visible select-none">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 1200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <defs>
                <mask id="left-trail-mask">
                  <path ref={leftMaskRef} d="M 45,0 C 45,150 25,200 25,300 C 25,400 70,450 70,550 C 70,620 20,620 20,680 C 20,740 75,740 75,680 C 75,620 25,620 25,750 C 25,850 65,900 65,1000 C 65,1100 45,1150 45,1200" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
                </mask>
              </defs>
              <path ref={leftPathRef} d="M 45,0 C 45,150 25,200 25,300 C 25,400 70,450 70,550 C 70,620 20,620 20,680 C 20,740 75,740 75,680 C 75,620 25,620 25,750 C 25,850 65,900 65,1000 C 65,1100 45,1150 45,1200" className="stroke-emerald-500 dark:stroke-emerald-400" strokeWidth="3" strokeDasharray="6, 6" strokeLinecap="round" mask="url(#left-trail-mask)" />
            </svg>
            <div ref={leftPlaneRef} className="absolute text-emerald-600 dark:text-emerald-400 w-5 h-5 md:w-8 lg:w-10 opacity-0 transition-opacity duration-300 pointer-events-none select-none" style={{ left: '50%', top: '0%', transform: 'translate(-50%, -50%) rotate(0deg)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full filter drop-shadow-[0_3px_6px_rgba(16,185,129,0.45)]">
                <path d="M12,22 L10.5,14 L2,14 L2,12 L10.5,10 L10.5,5 L7,3 L7,2 L12,3 L17,2 L17,3 L13.5,5 L13.5,10 L22,12 L22,14 L13.5,14 Z" />
              </svg>
            </div>
          </div>

          {/* Right Side Gutter SVG & Plane */}
          <div className="absolute top-0 bottom-0 right-0 w-4 md:w-16 lg:w-24 md:translate-x-full pointer-events-none z-10 overflow-visible select-none">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 1200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <defs>
                <mask id="right-trail-mask">
                  <path ref={rightMaskRef} d="M 55,0 C 55,100 75,180 75,250 C 75,320 30,380 30,480 C 30,540 80,540 80,600 C 80,660 25,660 25,600 C 25,540 75,540 75,680 C 75,800 35,850 35,950 C 35,1050 55,1120 55,1200" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
                </mask>
              </defs>
              <path ref={rightPathRef} d="M 55,0 C 55,100 75,180 75,250 C 75,320 30,380 30,480 C 30,540 80,540 80,600 C 80,660 25,660 25,600 C 25,540 75,540 75,680 C 75,800 35,850 35,950 C 35,1050 55,1120 55,1200" className="stroke-emerald-500 dark:stroke-emerald-400" strokeWidth="3" strokeDasharray="6, 6" strokeLinecap="round" mask="url(#right-trail-mask)" />
            </svg>
            <div ref={rightPlaneRef} className="absolute text-emerald-600 dark:text-emerald-400 w-5 h-5 md:w-8 lg:w-10 opacity-0 transition-opacity duration-300 pointer-events-none select-none" style={{ left: '50%', top: '0%', transform: 'translate(-50%, -50%) rotate(0deg)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full filter drop-shadow-[0_3px_6px_rgba(16,185,129,0.45)]">
                <path d="M12,22 L10.5,14 L2,14 L2,12 L10.5,10 L10.5,5 L7,3 L7,2 L12,3 L17,2 L17,3 L13.5,5 L13.5,10 L22,12 L22,14 L13.5,14 Z" />
              </svg>
            </div>
          </div>

          {/* 4. TRAVEL STORIES / LOGS PREVIEW */}
          <section ref={diariesRef} className="space-y-8 border-t border-slate-100 dark:border-slate-800/80 pt-16">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span 
                className={`text-emerald-500 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest font-sans inline-block transition-all duration-[800ms] ease-out ${
                  isDiariesVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[40px] scale-[0.98]'
                }`}
              >
                Traveler Diaries
              </span>
              <h2 
                className={`text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-serif transition-all duration-[800ms] ease-out ${
                  isDiariesVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[40px] scale-[0.98]'
                }`}
                style={{ transitionDelay: '150ms' }}
              >
                Stories from the Road
              </h2>
              <p 
                className={`text-sm sm:text-base text-slate-500 dark:text-slate-400 transition-all duration-[800ms] ease-out ${
                  isDiariesVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[40px] scale-[0.98]'
                }`}
                style={{ transitionDelay: '150ms' }}
              >
                Read inspiring travel logs and trip journals shared by the TravelVerse explorer community.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {mockLogs.map((log, index) => (
                <div 
                  key={log.id} 
                  className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl overflow-hidden hover-card flex flex-col justify-between transition-all ${
                    isDiariesVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[40px] scale-[0.98]'
                  }`}
                  style={{ 
                    transitionProperty: 'all',
                    transitionDuration: '800ms',
                    transitionTimingFunction: 'ease-out',
                    transitionDelay: `${index * 150 + 300}ms`
                  }}
                >
                  <div>
                    {/* Image and location tag */}
                    <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                      <img 
                        src={log.cover_image} 
                        alt={log.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 left-3 bg-slate-950/60 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        {log.destination}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6">
                      {/* Author Meta */}
                      <div className="flex items-center gap-2 mb-3">
                        <img 
                          src={log.avatar} 
                          alt={log.author} 
                          className="h-6 w-6 rounded-full bg-emerald-50"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{log.author}</span>
                        <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <Heart className="h-3.5 w-3.5 text-rose-500" />
                          <span>{log.likes} likes</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer line-clamp-1">
                        {log.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-3 leading-relaxed">
                        {log.excerpt}
                      </p>
                    </div>
                  </div>

                  {/* Excerpt Footer CTA */}
                  <div className="px-6 pb-6 pt-0 border-t border-slate-50 dark:border-slate-800/40 mt-3">
                    <Link 
                      to="/auth" 
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 mt-3"
                    >
                      Read Full Story
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>


          {/* 5. COMMUNITY DISCOVERY SECTION */}
          <section ref={communitiesRef} className="space-y-8 border-t border-slate-100 dark:border-slate-800/80 pt-16">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span 
                className={`text-emerald-500 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest font-sans inline-block transition-all duration-[800ms] ease-out ${
                  isCommunitiesVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[40px] scale-[0.98]'
                }`}
              >
                Find Your Tribe
              </span>
              <h2 
                className={`text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-serif transition-all duration-[800ms] ease-out ${
                  isCommunitiesVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[40px] scale-[0.98]'
                }`}
                style={{ transitionDelay: '150ms' }}
              >
                Explore Popular Communities
              </h2>
              <p 
                className={`text-sm sm:text-base text-slate-500 dark:text-slate-400 transition-all duration-[800ms] ease-out ${
                  isCommunitiesVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[40px] scale-[0.98]'
                }`}
                style={{ transitionDelay: '300ms' }}
              >
                Connect with digital nomads, mountain trekkers, and cultural explorers heading to similar coordinates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockDiscoverCommunities.map((comm, index) => (
                <div 
                  key={comm.id} 
                  className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden hover-card flex flex-col justify-between transition-all shadow-xs ${
                    isCommunitiesVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[40px] scale-[0.98]'
                  }`}
                  style={{ 
                    transitionProperty: 'all',
                    transitionDuration: '800ms',
                    transitionTimingFunction: 'ease-out',
                    transitionDelay: `${index * 150 + 450}ms`
                  }}
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden relative">
                      <img 
                        src={comm.cover_image} 
                        alt={comm.name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-slate-950/60 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        {comm.category}
                      </div>
                    </div>

                    <div className="p-4">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                        {comm.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {comm.member_count} members
                      </span>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <Link
                      to={user ? "/communities" : "/auth"}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs hover:shadow-emerald-500/10 transition-all flex items-center justify-center cursor-pointer"
                    >
                      Join Hub
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>

      {/* 6. PRE-FOOTER BANNER */}
      <section ref={finalCtaRef} className="bg-slate-900 dark:bg-slate-900/60 py-24 text-white border-t border-slate-200/20 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className={`text-3xl sm:text-4xl font-bold font-serif leading-tight transition-all duration-[1000ms] ease-out ${
            isFinalCtaVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-[30px]'
          }`}>
            Ready to catalog your global journeys?
          </h2>
          <p className={`text-slate-300 max-w-2xl mx-auto text-sm sm:text-base transition-all duration-[1000ms] ease-out delay-200 ${
            isFinalCtaVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-[30px]'
          }`}>
            Create an account in seconds to begin mapping countries, planning group itineraries with real-time budget splitting, and connecting with travel hubs.
          </p>
          <div className={`pt-4 transition-all duration-[1000ms] ease-out delay-400 ${
            isFinalCtaVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-[30px]'
          }`}>
            <Link
              to={user ? "/" : "/auth?tab=register"}
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 text-sm sm:text-base cursor-pointer hover:scale-102"
            >
              Sign Up Now
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="font-semibold text-slate-500 dark:text-slate-400">TravelVerse — The Social Platform for Globetrotters</p>
          <p>© {new Date().getFullYear()} TravelVerse Inc. All rights reserved.</p>
          <p className="text-slate-400/80 max-w-md mx-auto">
            Built with React, TypeScript, Tailwind CSS, Node.js, SQLite, and Google Gemini AI.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
