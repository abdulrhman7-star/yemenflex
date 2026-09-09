'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// ==================== CONFIG ====================
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNjBmMDc1Y2YzNmM2ZGZiMTM2YzNjMGFlNTY0ZDQ2MSIsIm5iZiI6MTc4NjkxNDAzNC4xMjgsInN1YiI6IjZhODIyNGYyMjYxNDgxNDlkZTc2OGM1MiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.h-UBf7qsxc6caT3NTjZ4qBpeOqMhzndlqISR1W_79V8';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const GENRES = [
    { id: 28, name: "أكشن (Action)" }, { id: 12, name: "مغامرة (Adventure)" }, { id: 16, name: "أنمي (Animation)" },
    { id: 35, name: "كوميدي (Comedy)" }, { id: 80, name: "جريمة (Crime)" }, { id: 99, name: "وثائقي (Documentary)" },
    { id: 18, name: "دراما (Drama)" }, { id: 10751, name: "عائلي (Family)" }, { id: 14, name: "فانتازيا (Fantasy)" },
    { id: 36, name: "تاريخي (History)" }, { id: 27, name: "رعب (Horror)" }, { id: 10402, name: "موسيقي (Music)" },
    { id: 9648, name: "غموض (Mystery)" }, { id: 10749, name: "رومانسي (Romance)" }, { id: 878, name: "خيال علمي (Sci-Fi)" },
    { id: 10770, name: "تلفزيوني (TV Movie)" }, { id: 53, name: "إثارة (Thriller)" }, { id: 10752, name: "حرب (War)" }, { id: 37, name: "غربي (Western)" }
];

export default function WorldCinemaPage() {
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedMedia, setSelectedMedia] = useState<any>(null);
    const [mediaType, setMediaType] = useState<string>('movie');
    const [selectedGenre, setSelectedGenre] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSort, setSelectedSort] = useState<string>('popularity.desc');
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    // تفاصيل المسلسلات
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

    // المشغل والقوائم
    const [serverProvider, setServerProvider] = useState<string>('vidsrc');
    const [playerUrl, setPlayerUrl] = useState<string>('');
    const [isPlayerActive, setIsPlayerActive] = useState<boolean>(false);
    
    // القائمة الجانبية والإعلان
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const [trailerKey, setTrailerKey] = useState<string | null>(null);
    const [toasts, setToasts] = useState<any[]>([]);

    const showToast = (message: string, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter(t => t.id !== id));
        }, 2800);
    };

    const handleResetToHome = () => {
        setSelectedGenre('');
        setSelectedYear('');
        setSelectedSort('popularity.desc');
        setSearchQuery('');
        setMediaType('movie');
        setIsPlayerActive(false);
        setPlayerUrl('');
        setSelectedMedia(null);
        showToast('🏠 تم العودة للرئيسية بنجاح', 'success');
    };

    const fetchTMDB = async (endpoint: string) => {
        try {
            const res = await fetch(`${TMDB_BASE}${endpoint}`, {
                headers: { Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`, accept: 'application/json' }
            });
            if (!res.ok) throw new Error('API Error');
            return await res.json();
        } catch {
            return { results: [] };
        }
    };

    const setupPlayerUrl = (type: string, media: any, s: number, ep: number, provider: string) => {
        if (!media) return;
        const tmdbId = media.id;
        const imdbId = media.external_ids?.imdb_id || tmdbId;
        let url = "";

        if (provider === 'vidsrc') {
            url = type === 'tv' 
                ? `https://vidsrcme.ru/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${ep}&ds_lang=ar&autonext=1&autoplay=1&mute=1` 
                : `https://vidsrcme.ru/embed/movie?imdb=${imdbId}&ds_lang=ar&autoplay=1&mute=1`;
        } else if (provider === 'multiembed') {
            url = type === 'tv' ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${ep}&autoplay=1` : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&autoplay=1`;
        } else if (provider === '2embed') {
            url = type === 'tv' ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${ep}` : `https://www.2embed.cc/embed/${imdbId}`;
        } else if (provider === 'smashy') {
            url = type === 'tv' ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${s}&episode=${ep}` : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`;
        } else if (provider === 'moviesapi') {
            url = type === 'tv' ? `https://moviesapi.club/tv/${tmdbId}-${s}-${ep}` : `https://moviesapi.club/movie/${tmdbId}`;
        } else if (provider === 'vidlink') {
            url = type === 'tv' ? `https://vidlink.pro/tv/${tmdbId}/${s}/${ep}?primaryColor=e50914&autoplay=1` : `https://vidlink.pro/movie/${tmdbId}?primaryColor=e50914&autoplay=1`;
        }
        setPlayerUrl(url);
    };

    const loadEpisodes = async (showId: number, seasonNum: number) => {
        setSelectedSeason(seasonNum);
        const data = await fetchTMDB(`/tv/${showId}/season/${seasonNum}?language=ar-SA`);
        setEpisodes(data.episodes || []);
        if (data.episodes?.length > 0) {
            setSelectedEpisode(1);
            setupPlayerUrl('tv', selectedMedia, seasonNum, 1, serverProvider);
        }
    };

    useEffect(() => {
        const applyAdvancedFilters = async (page = 1) => {
            setLoading(true);
            let params = [`language=ar-SA`, `sort_by=${selectedSort}`, `page=${page}`, `include_adult=false`];
            if (selectedGenre) params.push(`with_genres=${selectedGenre}`);
            if (selectedYear) {
                if (selectedYear === 'classic') params.push(`primary_release_date.lte=1989-12-31`);
                else if (selectedYear.includes('s')) {
                    const start = selectedYear.replace('s', '');
                    params.push(`primary_release_date.gte=${start}-01-01&primary_release_date.lte=${parseInt(start)+9}-12-31`);
                } else {
                    params.push(mediaType === 'movie' ? `primary_release_year=${selectedYear}` : `first_air_date_year=${selectedYear}`);
                }
            }

            const data = await fetchTMDB(`/discover/${mediaType}?${params.join('&')}`);
            setMovies(data.results || []);
            setLoading(false);
        };

        applyAdvancedFilters(1);
    }, [mediaType, selectedGenre, selectedYear, selectedSort]);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (!searchQuery.trim()) return;
            setLoading(true);
            const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(searchQuery)}&language=ar-SA`);
            const filtered = (data.results || []).filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv');
            setMovies(filtered);
            setLoading(false);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const openMedia = async (id: number, type: string) => {
        setServerProvider('vidsrc');
        const details = await fetchTMDB(`/${type}/${id}?language=ar-SA&append_to_response=external_ids,credits,videos`);
        setSelectedMedia({ ...details, mediaType: type });

        if (type === 'tv') {
            const filteredSeasons = (details.seasons || []).filter((s: any) => s.season_number > 0);
            setSeasons(filteredSeasons);
            if (filteredSeasons.length > 0) {
                loadEpisodes(id, filteredSeasons[0].season_number);
            }
        } else {
            setupPlayerUrl(type, details, 0, 0, 'vidsrc');
        }

        const trailer = (details.videos?.results || []).find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        setTrailerKey(trailer ? trailer.key : null);
        setIsPlayerActive(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleServerChange = (e: any) => {
        const val = e.target.value;
        setServerProvider(val);
        setupPlayerUrl(selectedMedia.mediaType, selectedMedia, selectedSeason, selectedEpisode, val);
        showToast('🔄 تم تغيير السيرفر', 'success');
    };

    return (
        <div dir="rtl" className="min-h-screen bg-[#070707] text-white font-sans overflow-x-hidden">
            {/* Toast Container */}
            <div className="fixed top-[76px] left-4 z-[9999] flex flex-col gap-2">
                {toasts.map(t => (
                    <div key={t.id} className="bg-[#181818] border border-white/10 border-r-4 border-r-[#e50914] rounded-xl px-4 py-3 text-[13px] font-semibold">
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Trailer Modal */}
            {trailerKey && (
                <div className="fixed inset-0 bg-black/92 z-[9999] flex items-center justify-center p-4">
                    <div className="relative w-full max-w-[900px] aspect-video bg-black rounded-xl overflow-hidden">
                        <button onClick={() => setTrailerKey(null)} className="absolute -top-9 right-0 bg-[#e50914] text-white w-8 h-8 rounded-full cursor-pointer border-none">✕</button>
                        <iframe src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`} className="w-full h-full border-none" allowFullScreen />
                    </div>
                </div>
            )}

            {/* Sidebar */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/75 z-[1100]" onClick={() => setIsSidebarOpen(false)}>
                    <aside className="fixed top-0 right-0 w-[280px] max-w-[80vw] h-screen bg-[#111] border-l border-white/10 z-[1200] p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
                            <span className="font-bold">📁 التصنيفات</span>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-[#aaa] cursor-pointer bg-none border-none text-[22px]">✕</button>
                        </div>
                        {GENRES.map(g => (
                            <div key={g.id} onClick={() => { setSelectedGenre(String(g.id)); setIsSidebarOpen(false); }} className="py-3.5 px-4 rounded-xl bg-[#181818] text-[#ddd] text-[14px] cursor-pointer mb-2">
                                {g.name}
                            </div>
                        ))}
                    </aside>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-[1000] bg-[#070707]/95 backdrop-blur-2xl border-b border-white/10">
                <div className="w-[min(1400px,calc(100%-24px))] mx-auto h-16 flex items-center gap-2 justify-between">
                    
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsSidebarOpen(true)} className="bg-transparent border border-white/10 text-white p-2.5 rounded-[10px] cursor-pointer">☰</button>
                        
                        <a href="#" onClick={(e) => { e.preventDefault(); handleResetToHome(); }} className="flex items-center gap-1.5 text-[18px] font-black no-underline text-white">
                            <span className="w-8 h-8 rounded-lg grid place-items-center bg-[#e50914] text-[14px]">▶</span>
                            <span>movies<span className="text-[#e50914]">io</span></span>
                        </a>

                        <Link href="/" className="no-underline hidden sm:block">
                            <button className="bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">
                                🏠 الرئيسية
                            </button>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex gap-2">
                            <button onClick={handleResetToHome} className="text-[#aaa] bg-none border-none cursor-pointer text-xs font-bold">الرئيسية</button>
                            <button onClick={() => setMediaType('movie')} className={`bg-none border-none cursor-pointer text-xs font-bold ${mediaType === 'movie' ? 'text-white' : 'text-[#aaa]'}`}>أفلام</button>
                            <button onClick={() => setMediaType('tv')} className={`bg-none border-none cursor-pointer text-xs font-bold ${mediaType === 'tv' ? 'text-white' : 'text-[#aaa]'}`}>مسلسلات</button>
                        </div>
                        
                        <input 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="ابحث..." 
                            className="w-[130px] sm:w-[200px] h-[38px] px-2.5 border border-white/10 rounded-[10px] bg-[#111] text-white text-[13px] outline-none" 
                        />
                    </div>
                </div>
            </header>

            <main className="w-[min(1400px,calc(100%-24px))] mx-auto py-4">
                {/* Hero */}
                <section className="relative pt-5 pb-2.5 mb-2.5">
                    <h1 className="text-[26px] sm:text-[36px] font-black mb-2">عالم السينما <span className="text-[#e50914]">بدون حدود</span></h1>
                    <p className="text-[#bbb] text-[13px] sm:text-[15px]">شاهد مسلسلاتك من حيث توقفت، مع تشغيل تلقائي للحلقات، بأقوى سيرفرات عالمية وبدون تقطيع.</p>
                </section>

                {/* Filters */}
                <div className="bg-[#181818] border border-white/10 rounded-xl p-3 my-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px]">
                        <option value="movie">🎬 أفلام</option>
                        <option value="tv">📺 مسلسلات</option>
                    </select>
                    <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px]">
                        <option value="">جميع التصنيفات</option>
                        {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px]">
                        <option value="">جميع السنوات</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                    <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value)} className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px]">
                        <option value="popularity.desc">🔥 الأكثر شعبية</option>
                        <option value="vote_average.desc">⭐ الأعلى تقييماً</option>
                        <option value="primary_release_date.desc">🆕 الأحدث</option>
                    </select>
                </div>

                {/* Detail Panel */}
                {isPlayerActive && selectedMedia && (
                    <div className="my-4 p-4 border border-white/15 rounded-2xl bg-[#171717]">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                                <img src={selectedMedia.poster_path ? `${IMAGE_BASE}${selectedMedia.poster_path}` : ''} className="w-[110px] h-[165px] sm:w-[140px] sm:h-[210px] object-cover rounded-[10px] shrink-0" />
                                <div className="flex-1">
                                    <h2 className="text-[20px] sm:text-[24px] mb-1.5 font-black">{selectedMedia.title || selectedMedia.name}</h2>
                                    <p className="text-[#bbb] text-[12px] sm:text-[13px] leading-relaxed mb-2.5 line-clamp-4">{selectedMedia.overview}</p>
                                    <button onClick={() => { setIsPlayerActive(false); setPlayerUrl(''); }} className="bg-[#333] text-white px-3 py-1.5 rounded-md cursor-pointer border-none text-xs">إغلاق المشغل</button>
                                </div>
                            </div>
                                
                            {selectedMedia.mediaType === 'tv' && (
                                <div className="mt-2.5 border-t border-white/10 pt-2.5 w-full">
                                    <div className="flex gap-2 mb-2 flex-wrap">
                                        <select value={selectedSeason} onChange={(e) => loadEpisodes(selectedMedia.id, Number(e.target.value))} className="py-1.5 px-2.5 bg-[#111] text-white rounded-lg text-[13px] border border-white/10">
                                            {seasons.map((s: any) => <option key={s.season_number} value={s.season_number}>الموسم {s.season_number}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-1.5 flex-nowrap overflow-x-auto pb-1.5">
                                        {episodes.map((ep: any) => (
                                            <button key={ep.episode_number} onClick={() => { setSelectedEpisode(ep.episode_number); setupPlayerUrl('tv', selectedMedia, selectedSeason, ep.episode_number, serverProvider); }} className={`py-1.5 px-3 rounded-md cursor-pointer border-none text-xs whitespace-nowrap shrink-0 ${selectedEpisode === ep.episode_number ? 'bg-[#e50914] text-white' : 'bg-[#222] text-white'}`}>
                                                حلقة {ep.episode_number}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Player Section */}
                        <div className="mt-4 border border-white/10 rounded-xl overflow-hidden bg-black">
                            <div className="py-2 px-3 bg-[#111] flex justify-between items-center">
                                <span className="text-xs font-extrabold">مشغل moviesio Pro</span>
                                <select value={serverProvider} onChange={handleServerChange} className="py-1 px-2 bg-[#222] text-white rounded-md border-none text-xs">
                                    <option value="vidsrc">🚀 سيرفر 1</option>
                                    <option value="multiembed">⚡ سيرفر 2</option>
                                    <option value="2embed">🎬 سيرفر 3</option>
                                    <option value="smashy">📡 سيرفر 4</option>
                                    <option value="moviesapi">🎞️ سيرفر 5</option>
                                    <option value="vidlink">🔥 سيرفر 6</option>
                                </select>
                            </div>
                            <div className="relative w-full aspect-video">
                                <iframe src={playerUrl} className="absolute inset-0 w-full h-full border-0" allowFullScreen />
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid Results - Responsive Layout */}
                {loading ? (
                    <div className="text-center py-10 text-[#aaa] text-[14px]">جاري التحميل...</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2.5">
                        {movies.map(item => {
                            const type = item.media_type || mediaType;
                            const title = item.title || item.name || 'بدون عنوان';
                            const poster = item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : 'https://via.placeholder.com/300x450';
                            return (
                                <div key={item.id} onClick={() => openMedia(item.id, type)} className="rounded-[10px] bg-[#121212] border border-white/5 cursor-pointer overflow-hidden flex flex-col">
                                    <div className="aspect-[2/3] overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                                        <img src={poster} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-2">
                                        <h3 className="text-xs whitespace-nowrap overflow-hidden text-ellipsis font-bold">{title}</h3>
                                        <div className="flex justify-between mt-1 text-[10px] text-[#888]">
                                            <span>{type === 'tv' ? 'مسلسل' : 'فيلم'}</span>
                                            <span className="text-[#ffd700]">★ {Number(item.vote_average || 0).toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
