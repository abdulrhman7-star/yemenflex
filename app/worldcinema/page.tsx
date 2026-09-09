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
        <div dir="rtl" style={{ minHeight: '100vh', background: '#070707', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
            {/* Toast Container */}
            <div style={{ position: 'fixed', top: '76px', left: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ background: '#181818', border: '1px solid rgba(255,255,255,.09)', borderRight: '4px solid #e50914', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Trailer Modal */}
            {trailerKey && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '900px', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                        <button onClick={() => setTrailerKey(null)} style={{ position: 'absolute', top: '-36px', right: 0, background: '#e50914', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', border: 'none' }}>✕</button>
                        <iframe src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                    </div>
                </div>
            )}

            {/* Sidebar */}
            {isSidebarOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1100 }} onClick={() => setIsSidebarOpen(false)}>
                    <aside style={{ position: 'fixed', top: 0, right: 0, width: '280px', maxWidth: '80vw', height: '100vh', background: '#111', borderLeft: '1px solid rgba(255,255,255,.09)', zIndex: 1200, padding: '20px', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,.09)' }}>
                            <span style={{ fontWeight: 'bold' }}>📁 التصنيفات</span>
                            <button onClick={() => setIsSidebarOpen(false)} style={{ color: '#aaa', cursor: 'pointer', background: 'none', border: 'none', fontSize: '22px' }}>✕</button>
                        </div>
                        {GENRES.map(g => (
                            <div key={g.id} onClick={() => { setSelectedGenre(String(g.id)); setIsSidebarOpen(false); }} style={{ padding: '14px 16px', borderRadius: '12px', background: '#181818', color: '#ddd', fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}>
                                {g.name}
                            </div>
                        ))}
                    </aside>
                </div>
            )}

            {/* Header */}
            <header style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'rgba(7,7,7,.95)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,.09)' }}>
                <div style={{ width: 'min(1400px, calc(100% - 24px))', margin: 'auto', height: '64px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.09)', color: '#fff', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer' }}>☰</button>
                        
                        <a href="#" onClick={(e) => { e.preventDefault(); handleResetToHome(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: 900, textDecoration: 'none', color: '#fff' }}>
                            <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'grid', placeItems: 'center', background: '#e50914', fontSize: '14px' }}>▶</span>
                            <span>movies<span style={{ color: '#e50914' }}>io</span></span>
                        </a>

                        <Link href="/" style={{ textDecoration: 'none', display: 'none', '@media (min-width: 640px)': { display: 'block' } } as any}>
                            <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                🏠 الرئيسية
                            </button>
                        </Link>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'none', gap: '8px', '@media (min-width: 768px)': { display: 'flex' } } as any}>
                            <button onClick={handleResetToHome} style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>الرئيسية</button>
                            <button onClick={() => setMediaType('movie')} style={{ color: mediaType === 'movie' ? '#fff' : '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>أفلام</button>
                            <button onClick={() => setMediaType('tv')} style={{ color: mediaType === 'tv' ? '#fff' : '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>مسلسلات</button>
                        </div>
                        
                        <input 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="ابحث..." 
                            style={{ width: '130px', sm: {width: '200px'}, height: '38px', padding: '0 10px', border: '1px solid rgba(255,255,255,.09)', borderRadius: '10px', background: '#111', color: '#fff', fontSize: '13px', outline: 'none' }} 
                        />
                    </div>
                </div>
            </header>

            <main style={{ width: 'min(1400px, calc(100% - 24px))', margin: 'auto', padding: '16px 0' }}>
                {/* Hero */}
                <section style={{ position: 'relative', padding: '20px 0 10px 0', marginBottom: '10px' }}>
                    <h1 style={{ fontSize: '26px', sm: {fontSize: '36px'}, fontWeight: 900, marginBottom: '8px' }}>عالم السينما <span style={{ color: '#e50914' }}>بدون حدود</span></h1>
                    <p style={{ color: '#bbb', fontSize: '13px', sm: {fontSize: '15px'} }}>شاهد مسلسلاتك من حيث توقفت، مع تشغيل تلقائي للحلقات، بأقوى سيرفرات عالمية وبدون تقطيع.</p>
                </section>

                {/* Filters */}
                <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,.09)', borderRadius: '12px', padding: '12px', margin: '12px 0', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', sm: {gridTemplateColumns: 'repeat(4, 1fr)'}, gap: '8px' }}>
                    <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} style={{ padding: '8px', background: '#111', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,.09)', fontSize: '13px' }}>
                        <option value="movie">🎬 أفلام</option>
                        <option value="tv">📺 مسلسلات</option>
                    </select>
                    <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} style={{ padding: '8px', background: '#111', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,.09)', fontSize: '13px' }}>
                        <option value="">جميع التصنيفات</option>
                        {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: '8px', background: '#111', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,.09)', fontSize: '13px' }}>
                        <option value="">جميع السنوات</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                    <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value)} style={{ padding: '8px', background: '#111', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,.09)', fontSize: '13px' }}>
                        <option value="popularity.desc">🔥 الأكثر شعبية</option>
                        <option value="vote_average.desc">⭐ الأعلى تقييماً</option>
                        <option value="primary_release_date.desc">🆕 الأحدث</option>
                    </select>
                </div>

                {/* Detail Panel */}
                {isPlayerActive && selectedMedia && (
                    <div style={{ margin: '16px 0', padding: '16px', border: '1px solid rgba(255,255,255,.09)', borderRadius: '16px', background: '#171717' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', md: {flexDirection: 'row'}, gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                                <img src={selectedMedia.poster_path ? `${IMAGE_BASE}${selectedMedia.poster_path}` : ''} style={{ width: '110px', height: '165px', sm: {width: '140px', height: '210px'}, objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: '20px', sm: {fontSize: '24px'}, marginBottom: '6px', fontWeight: 900 }}>{selectedMedia.title || selectedMedia.name}</h2>
                                    <p style={{ color: '#bbb', fontSize: '12px', sm: {fontSize: '13px'}, lineHeight: '1.6', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{selectedMedia.overview}</p>
                                    <button onClick={() => { setIsPlayerActive(false); setPlayerUrl(''); }} style={{ background: '#333', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', border: 'none', fontSize: '12px' }}>إغلاق المشغل</button>
                                </div>
                            </div>
                                
                            {selectedMedia.mediaType === 'tv' && (
                                <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: '10px', width: '100%' }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                        <select value={selectedSeason} onChange={(e) => loadEpisodes(selectedMedia.id, Number(e.target.value))} style={{ padding: '6px 10px', background: '#111', color: '#fff', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(255,255,255,.09)' }}>
                                            {seasons.map((s: any) => <option key={s.season_number} value={s.season_number}>الموسم {s.season_number}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '6px' }}>
                                        {episodes.map((ep: any) => (
                                            <button key={ep.episode_number} onClick={() => { setSelectedEpisode(ep.episode_number); setupPlayerUrl('tv', selectedMedia, selectedSeason, ep.episode_number, serverProvider); }} style={{ padding: '6px 12px', background: selectedEpisode === ep.episode_number ? '#e50914' : '#222', color: '#fff', borderRadius: '6px', cursor: 'pointer', border: 'none', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                حلقة {ep.episode_number}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Player Section */}
                        <div style={{ marginTop: '16px', border: '1px solid rgba(255,255,255,.09)', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                            <div style={{ padding: '8px 12px', background: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800 }}>مشغل moviesio Pro</span>
                                <select value={serverProvider} onChange={handleServerChange} style={{ padding: '4px 8px', background: '#222', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '12px' }}>
                                    <option value="vidsrc">🚀 سيرفر 1</option>
                                    <option value="multiembed">⚡ سيرفر 2</option>
                                    <option value="2embed">🎬 سيرفر 3</option>
                                    <option value="smashy">📡 سيرفر 4</option>
                                    <option value="moviesapi">🎞️ سيرفر 5</option>
                                    <option value="vidlink">🔥 سيرفر 6</option>
                                </select>
                            </div>
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                                <iframe src={playerUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen />
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid Results - Responsive Layout */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' }}>جاري التحميل...</div>
                ) : (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
                        '@media (min-width: 480px)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
                        '@media (min-width: 768px)': { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
                        '@media (min-width: 1024px)': { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' },
                        '@media (min-width: 1280px)': { gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' },
                        gap: '10px' 
                    } as any}>
                        {movies.map(item => {
                            const type = item.media_type || mediaType;
                            const title = item.title || item.name || 'بدون عنوان';
                            const poster = item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : 'https://via.placeholder.com/300x450';
                            return (
                                <div key={item.id} onClick={() => openMedia(item.id, type)} style={{ borderRadius: '10px', background: '#121212', border: '1px solid rgba(255,255,255,.06)', cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ aspectRatio: '2/3', overflow: 'hidden' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                                        <img src={poster} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ padding: '8px' }}>
                                        <h3 style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>{title}</h3>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#888' }}>
                                            <span>{type === 'tv' ? 'مسلسل' : 'فيلم'}</span>
                                            <span style={{ color: '#ffd700' }}>★ {Number(item.vote_average || 0).toFixed(1)}</span>
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