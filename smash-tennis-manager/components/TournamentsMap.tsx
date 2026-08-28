import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { Tournament, UserProfile } from '../types';
import { 
    getTournamentCoordinates, 
    calculateDistanceKm, 
    formatDistance, 
    openDirections, 
    openWaze, 
    UserLocation, 
    DEFAULT_MAP_CENTER 
} from '../utils/geoUtils';
import { getTournamentTier, getTierInfoByKey } from '../utils/tournamentTiers';
import { 
    MapPin, 
    Navigation, 
    Trophy, 
    Calendar, 
    DollarSign, 
    ChevronRight, 
    Filter, 
    X, 
    Search, 
    Locate, 
    Loader2, 
    Sparkles, 
    ExternalLink, 
    ChevronDown, 
    ChevronUp,
    Shield,
    Flame
} from 'lucide-react';

interface TournamentsMapProps {
    tournaments: Tournament[];
    user: UserProfile;
    onSelectTournament: (tournament: Tournament) => void;
    onCloseMap?: () => void;
}

const CATEGORY_OPTIONS = ['all', '1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', 'Open'];
const RADIUS_OPTIONS = [
    { label: 'Todos', value: null },
    { label: '15 km', value: 15 },
    { label: '30 km', value: 30 },
    { label: '50 km', value: 50 },
    { label: '100 km', value: 100 },
];

export const TournamentsMap: React.FC<TournamentsMapProps> = ({
    tournaments,
    user,
    onSelectTournament,
    onCloseMap,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const userLayerRef = useRef<L.LayerGroup | null>(null);

    // Helper Date Formatters
    const formatShortDate = (dateStr?: string) => {
        if (!dateStr) return 'A confirmar';
        try {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
            });
        } catch {
            return dateStr;
        }
    };

    const formatFullDate = (dateStr?: string) => {
        if (!dateStr) return 'Fecha a confirmar';
        try {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('es-AR', {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [onlyOpenRegistration, setOnlyOpenRegistration] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTier, setSelectedTier] = useState<string>('all');
    const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
    const [sortByDistance, setSortByDistance] = useState(false);

    // Map & Geolocation State
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
    const [showFiltersModal, setShowFiltersModal] = useState(false);

    // Initial Geolocation Auto-Detection on Mount
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords: UserLocation = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    };
                    setUserLocation(coords);
                    setSortByDistance(true);
                    setGpsStatusMessage('Ubicación detectada');
                },
                (err) => {
                    console.log('Passive geolocation skipped:', err.message);
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
            );
        }
    }, []);

    // Explicit User Location Trigger
    const handleLocateUser = () => {
        if (!('geolocation' in navigator)) {
            setGpsStatusMessage('Geolocalización no soportada');
            return;
        }

        setIsLocating(true);
        setGpsStatusMessage('Obteniendo tu ubicación GPS...');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords: UserLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                };
                setUserLocation(coords);
                setIsLocating(false);
                setSortByDistance(true);
                setGpsStatusMessage('Ubicación GPS precisa obtenida');

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([coords.lat, coords.lng], 13, {
                        duration: 1.2,
                        easeLinearity: 0.25,
                    });
                }
            },
            (err) => {
                console.warn('Geolocation error:', err.message);
                setIsLocating(false);
                setGpsStatusMessage('No se pudo obtener el GPS. Usando sede principal.');
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], 12);
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    // Calculate Coordinates & Distances for Tournaments
    const processedTournaments = useMemo(() => {
        return tournaments
            .map((t) => {
                const coords = getTournamentCoordinates(t);
                const distanceKm = userLocation
                    ? calculateDistanceKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
                    : null;
                const tier = getTournamentTier(t);
                const isOpen = t.status === 'active' && !t.registration_closed;
                const isDisputing = t.status === 'active' && !isOpen;
                const isFinished = t.status === 'finished';
                const shortDate = formatShortDate(t.start_date);
                const fullDate = formatFullDate(t.start_date);

                return {
                    ...t,
                    coords,
                    distanceKm,
                    tier,
                    isOpen,
                    isDisputing,
                    isFinished,
                    shortDate,
                    fullDate,
                };
            })
            .filter((t) => {
                // 1. Text Search (tournament name, club name, city)
                const query = searchQuery.toLowerCase().trim();
                if (query) {
                    const matchName = t.name.toLowerCase().includes(query);
                    const matchClub = (t.institutions?.name || '').toLowerCase().includes(query);
                    const matchCity = (t.institutions?.city || '').toLowerCase().includes(query);
                    const matchCat = (t.category || '').toLowerCase().includes(query);
                    if (!matchName && !matchClub && !matchCity && !matchCat) return false;
                }

                // 2. Open Registration Filter (if active)
                if (onlyOpenRegistration && !t.isOpen) {
                    return false;
                }

                // 3. Category Filter
                if (selectedCategory !== 'all') {
                    if (t.competitions && t.competitions.length > 0) {
                        const hasCat = t.competitions.some((c) =>
                            c.allowed_categories.some(
                                (cat) => cat.toLowerCase() === selectedCategory.toLowerCase()
                            )
                        );
                        if (!hasCat) return false;
                    } else if (t.category.toLowerCase() !== selectedCategory.toLowerCase()) {
                        return false;
                    }
                }

                // 4. Tier Filter
                if (selectedTier !== 'all') {
                    if (t.tier.tierKey !== selectedTier) return false;
                }

                // 5. Max Distance Radius Filter
                if (maxDistanceKm !== null && t.distanceKm !== null) {
                    if (t.distanceKm > maxDistanceKm) return false;
                }

                return true;
            })
            .sort((a, b) => {
                // Sort by distance if user location is available & requested
                if (sortByDistance && a.distanceKm !== null && b.distanceKm !== null) {
                    return a.distanceKm - b.distanceKm;
                }
                // Default sort by start date
                const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
                const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
                return dateA - dateB;
            });
    }, [
        tournaments,
        searchQuery,
        onlyOpenRegistration,
        selectedCategory,
        selectedTier,
        maxDistanceKm,
        sortByDistance,
        userLocation,
    ]);

    // Select first tournament by default if none is selected
    useEffect(() => {
        if (processedTournaments.length > 0 && !selectedTournamentId) {
            setSelectedTournamentId(processedTournaments[0].id);
        } else if (processedTournaments.length === 0) {
            setSelectedTournamentId(null);
        }
    }, [processedTournaments, selectedTournamentId]);

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const defaultCenter: [number, number] = [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];

        const map = L.map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: 11,
            zoomControl: false,
            attributionControl: false,
        });

        // Esri Dark Gray Canvas Basemap (Free, high performance, zero watermark / no API key required)
        const tileLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            {
                maxZoom: 16,
                attribution: '&copy; Esri &copy; OpenStreetMap',
            }
        ).addTo(map);

        // Dark Reference labels overlay
        L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
            {
                maxZoom: 16,
                attribution: '',
            }
        ).addTo(map);

        // Marker Cluster Group with custom Smash Tennis glowing bubbles
        const markersClusterGroup = (L as any).markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 45,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: 15,
            iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `
                        <div class="smash-cluster-container">
                            <div class="smash-cluster-halo"></div>
                            <div class="smash-cluster-bubble">
                                <span class="smash-cluster-count">${count}</span>
                                <span class="smash-cluster-label">Torneos</span>
                            </div>
                        </div>
                    `,
                    className: 'custom-cluster-leaflet-pin',
                    iconSize: [48, 48],
                    iconAnchor: [24, 24],
                });
            },
        });
        markersClusterGroup.addTo(map);

        const userLayer = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;
        tileLayerRef.current = tileLayer;
        markersLayerRef.current = markersClusterGroup;
        userLayerRef.current = userLayer;

        // Invalidate size shortly after mount for perfect rendering
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 250);

        return () => {
            clearTimeout(timer);
            map.remove();
            mapInstanceRef.current = null;
            tileLayerRef.current = null;
            markersLayerRef.current = null;
            userLayerRef.current = null;
        };
    }, []);

    // Render User Location Pin
    useEffect(() => {
        const map = mapInstanceRef.current;
        const userLayer = userLayerRef.current;
        if (!map || !userLayer) return;

        userLayer.clearLayers();

        if (!userLocation) return;

        const userPinHtml = `
            <div class="user-gps-pin-container">
                <div class="user-gps-pulse"></div>
                <div class="user-gps-dot"></div>
            </div>
        `;

        const userIcon = L.divIcon({
            html: userPinHtml,
            className: 'custom-user-pin',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });

        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
            icon: userIcon,
            zIndexOffset: 500,
        });

        userMarker.bindTooltip(
            `<div class="text-xs font-bold text-sky-400">📍 Tu ubicación actual</div>`,
            { direction: 'top', offset: [0, -10], opacity: 0.95 }
        );

        userLayer.addLayer(userMarker);
    }, [userLocation]);

    // Render Tournament Markers (Grouped by Club/Venue to prevent coordinate overlapping)
    useEffect(() => {
        const map = mapInstanceRef.current;
        const markersGroup = markersLayerRef.current;
        if (!map || !markersGroup) return;

        markersGroup.clearLayers();

        if (processedTournaments.length === 0) return;

        const bounds = L.latLngBounds([]);

        // Group tournaments by Venue / Club
        const venueMap = new Map<string, {
            key: string;
            clubName: string;
            cityName: string;
            coords: { lat: number; lng: number };
            distanceKm: number | null;
            tournaments: typeof processedTournaments;
            hasOpenRegistration: boolean;
        }>();

        processedTournaments.forEach((t) => {
            const key = t.institution_id || `${t.coords.lat.toFixed(4)}_${t.coords.lng.toFixed(4)}`;
            const existing = venueMap.get(key);
            if (existing) {
                existing.tournaments.push(t);
                if (t.isOpen) existing.hasOpenRegistration = true;
            } else {
                const clubName = t.institutions?.name || 'Club de Tenis';
                const cityName = t.institutions?.city || '';
                venueMap.set(key, {
                    key,
                    clubName,
                    cityName,
                    coords: t.coords,
                    distanceKm: t.distanceKm,
                    tournaments: [t],
                    hasOpenRegistration: t.isOpen,
                });
            }
        });

        const venueGroups = Array.from(venueMap.values());

        venueGroups.forEach((group) => {
            const isSingle = group.tournaments.length === 1;
            const isSelected = group.tournaments.some((t) => t.id === selectedTournamentId);
            const distanceStr = formatDistance(group.distanceKm);

            let pinHtml = '';
            let popupHtml = '';

            if (isSingle) {
                const t = group.tournaments[0];
                const tierBadge = t.tier.label;

                pinHtml = `
                    <div class="smash-map-pin ${isSelected ? 'is-selected' : ''} ${t.isOpen ? 'is-open' : ''}" data-tournament-id="${t.id}">
                        ${t.isOpen ? '<div class="pin-halo-pulse"></div>' : ''}
                        <div class="pin-card ${isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-slate-900 scale-110' : ''}">
                            <div class="pin-tier-pill" style="background-color: ${t.tier.badgeColor}; color: ${t.tier.textColor}">
                                ${tierBadge}
                            </div>
                            <div class="pin-content">
                                <span class="pin-title">${t.name}</span>
                                <span class="pin-club">${group.clubName}${group.cityName ? ` • ${group.cityName}` : ''}</span>
                                <div class="pin-date-tag">
                                    <span>📅 Inicia: <b>${t.shortDate}</b></span>
                                </div>
                            </div>
                            ${t.isOpen 
                                ? '<div class="pin-open-badge">● INSCRIPCIÓN ABIERTA</div>' 
                                : '<div class="pin-disputing-badge">⚡ DISPUTANDO</div>'}
                        </div>
                        <div class="pin-arrow"></div>
                    </div>
                `;

                popupHtml = `
                    <div class="p-4 bg-slate-900 text-white rounded-3xl max-w-[285px] border border-white/15 shadow-2xl">
                        <div class="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" style="background-color: ${t.tier.badgeColor}; color: ${t.tier.textColor}">
                                ${t.tier.label}
                            </span>
                            ${t.isOpen 
                                ? '<span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">● Inscripción Abierta</span>' 
                                : '<span class="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">⚡ En Disputa</span>'}
                        </div>
                        <h4 class="font-extrabold text-sm text-white mb-1 leading-tight">${t.name}</h4>
                        <p class="text-xs text-slate-300 mb-1.5 flex items-center gap-1">📍 ${group.clubName}${group.cityName ? ` • ${group.cityName}` : ''}</p>
                        
                        <div class="text-[11px] text-slate-300 font-semibold mb-2 flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                            <span>📅 Fecha de Inicio: <b class="text-white">${t.fullDate}</b></span>
                        </div>

                        ${distanceStr ? `<div class="text-[11px] text-sky-400 font-bold mb-2 flex items-center gap-1">🧭 A ${distanceStr} de tu ubicación</div>` : ''}

                        <div class="flex items-center justify-between text-xs font-semibold text-slate-400 py-2 border-t border-white/10 mb-3">
                            <span>Cat: <b class="text-white">${t.category}</b></span>
                            <span class="text-primary font-bold">${t.registration_price ? `$${t.registration_price.toLocaleString('es-AR')}` : 'Gratis'}</span>
                        </div>

                        <div class="flex gap-2">
                            ${t.isOpen ? `
                                <button onclick="window.__handleSelectSmashTournament('${t.id}')" class="flex-1 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 text-white text-xs font-extrabold py-2 px-3 rounded-xl text-center transition-all shadow-md shadow-primary/25 cursor-pointer flex items-center justify-center gap-1">
                                    <span>🎾 Inscribirme</span>
                                </button>
                            ` : `
                                <button onclick="window.__handleSelectSmashTournament('${t.id}')" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-xl text-center transition-all border border-white/10 shadow-md cursor-pointer flex items-center justify-center gap-1">
                                    <span>🏆 Ver Cuadros / Resultados</span>
                                </button>
                            `}
                            <button onclick="window.__handleNavigateToVenue('${group.coords.lat}', '${group.coords.lng}', '${encodeURIComponent(group.clubName)}')" class="bg-white/10 hover:bg-white/20 text-white text-xs p-2 rounded-xl transition-all border border-white/10 cursor-pointer" title="Cómo llegar con GPS">
                                🧭
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // Multi-tournament Pin in the same club
                pinHtml = `
                    <div class="smash-map-pin ${isSelected ? 'is-selected' : ''} ${group.hasOpenRegistration ? 'is-open' : ''}">
                        ${group.hasOpenRegistration ? '<div class="pin-halo-pulse"></div>' : ''}
                        <div class="pin-card ${isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-slate-900 scale-110' : ''}">
                            <div class="pin-multi-badge">
                                <span>🏆 ${group.tournaments.length} TORNEOS</span>
                            </div>
                            <div class="pin-content">
                                <span class="pin-title">${group.clubName}</span>
                                <span class="pin-club">${group.cityName || 'Sede oficial'}</span>
                                <div class="mt-1.5 space-y-1 border-t border-white/10 pt-1.5">
                                    ${group.tournaments.slice(0, 2).map((t) => `
                                        <div class="pin-multi-item">
                                            <span class="truncate font-bold">🎾 ${t.name} <span class="opacity-70 text-[8px]">(${t.category})</span></span>
                                            <span class="pin-multi-date">📅 ${t.shortDate}</span>
                                        </div>
                                    `).join('')}
                                    ${group.tournaments.length > 2 ? `<div class="text-[8.5px] text-sky-400 font-bold">+${group.tournaments.length - 2} más</div>` : ''}
                                </div>
                            </div>
                            ${group.hasOpenRegistration 
                                ? '<div class="pin-open-badge">● INSCRIPCIÓN ABIERTA</div>' 
                                : '<div class="pin-disputing-badge">⚡ DISPUTANDO</div>'}
                        </div>
                        <div class="pin-arrow"></div>
                    </div>
                `;

                popupHtml = `
                    <div class="p-4 bg-slate-900 text-white rounded-3xl max-w-[315px] border border-white/15 shadow-2xl">
                        <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
                            <div>
                                <h4 class="font-extrabold text-sm text-white leading-tight">${group.clubName}</h4>
                                <p class="text-xs text-slate-300">${group.cityName || 'Sede oficial'}</p>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                                ${group.tournaments.length} Torneos
                            </span>
                        </div>

                        ${distanceStr ? `<div class="text-[11px] text-sky-400 font-bold mb-2 flex items-center gap-1">🧭 A ${distanceStr} de tu ubicación</div>` : ''}

                        <div class="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar mb-3">
                            ${group.tournaments.map((t) => `
                                <div class="p-3 bg-white/5 rounded-2xl border ${t.isOpen ? 'border-emerald-500/30' : 'border-white/10'} hover:border-primary/50 transition-all flex flex-col justify-between gap-2">
                                    <div class="flex items-center justify-between gap-1">
                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider" style="background-color: ${t.tier.badgeColor}; color: ${t.tier.textColor}">
                                            ${t.tier.label}
                                        </span>
                                        ${t.isOpen 
                                            ? '<span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">● Abierto</span>' 
                                            : '<span class="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">⚡ En Disputa</span>'}
                                    </div>
                                    
                                    <div>
                                        <div class="font-extrabold text-xs text-white leading-tight">${t.name}</div>
                                        <div class="flex items-center justify-between text-[10px] text-slate-300 font-semibold mt-1">
                                            <span>Cat: <b class="text-white">${t.category}</b></span>
                                            <span>📅 Inicio: <b class="text-white">${t.shortDate}</b></span>
                                            <span class="text-primary font-bold">${t.registration_price ? `$${t.registration_price.toLocaleString('es-AR')}` : 'Gratis'}</span>
                                        </div>
                                    </div>

                                    ${t.isOpen ? `
                                        <button onclick="window.__handleSelectSmashTournament('${t.id}')" class="w-full bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl transition-all shadow-md shadow-primary/20 cursor-pointer">
                                            🎾 Inscribirme
                                        </button>
                                    ` : `
                                        <button onclick="window.__handleSelectSmashTournament('${t.id}')" class="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl transition-all border border-white/10 shadow-md cursor-pointer">
                                            🏆 Ver Cuadros / Resultados
                                        </button>
                                    `}
                                </div>
                            `).join('')}
                        </div>

                        <button onclick="window.__handleNavigateToVenue('${group.coords.lat}', '${group.coords.lng}', '${encodeURIComponent(group.clubName)}')" class="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer">
                            <span>🧭 Cómo llegar al Club</span>
                        </button>
                    </div>
                `;
            }

            const customIcon = L.divIcon({
                html: pinHtml,
                className: 'custom-tournament-leaflet-pin',
                iconSize: isSelected ? [190, 95] : [160, 85],
                iconAnchor: isSelected ? [95, 95] : [80, 85],
                popupAnchor: [0, -85],
            });

            const marker = L.marker([group.coords.lat, group.coords.lng], {
                icon: customIcon,
                zIndexOffset: isSelected ? 1000 : 10,
            });

            marker.bindPopup(popupHtml, {
                className: 'custom-smash-popup',
                maxWidth: 320,
                closeButton: false,
            });

            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                setSelectedTournamentId(group.tournaments[0].id);
                marker.openPopup();
                map.flyTo([group.coords.lat, group.coords.lng], Math.max(map.getZoom(), 13), {
                    duration: 0.8,
                    easeLinearity: 0.25,
                });
            });

            markersGroup.addLayer(marker);
            bounds.extend([group.coords.lat, group.coords.lng]);
        });

        // Add user location to bounds if present
        if (userLocation) {
            bounds.extend([userLocation.lat, userLocation.lng]);
        }

        // Initially fit bounds if not manually zooming
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
        }
    }, [processedTournaments, selectedTournamentId, userLocation]);

    // Focus Map when selectedTournamentId changes
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !selectedTournamentId) return;

        const target = processedTournaments.find((t) => t.id === selectedTournamentId);
        if (target) {
            map.flyTo([target.coords.lat, target.coords.lng], Math.max(map.getZoom(), 13), {
                duration: 0.9,
            });
        }
    }, [selectedTournamentId, processedTournaments]);

    // Global window hooks for popup action clicks
    useEffect(() => {
        (window as any).__handleSelectSmashTournament = (id: string) => {
            const found = tournaments.find((t) => t.id === id);
            if (found) {
                onSelectTournament(found);
            }
        };

        (window as any).__handleNavigateToVenue = (latStr: string, lngStr: string, label: string) => {
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            openDirections({ lat, lng }, decodeURIComponent(label));
        };

        return () => {
            delete (window as any).__handleSelectSmashTournament;
            delete (window as any).__handleNavigateToVenue;
        };
    }, [tournaments, onSelectTournament]);

    return (
        <div className="relative w-full h-[78vh] min-h-[550px] max-h-[850px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 flex flex-col animate-fade-in">
            {/* TOP FLOATING SEARCH & FILTER BAR */}
            <div className="absolute top-4 left-4 right-4 z-[500] flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por torneo, club o ciudad..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl text-xs sm:text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xl transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* GPS Locate Button */}
                    <button
                        onClick={handleLocateUser}
                        disabled={isLocating}
                        title="Detectar mi ubicación actual"
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-2xl text-xs font-bold backdrop-blur-xl border transition-all shadow-xl whitespace-nowrap ${
                            userLocation
                                ? 'bg-sky-500/20 text-sky-400 border-sky-400/40 hover:bg-sky-500/30'
                                : 'bg-slate-900/90 text-slate-300 border-white/15 hover:bg-slate-800'
                        }`}
                    >
                        {isLocating ? (
                            <Loader2 size={16} className="animate-spin text-sky-400" />
                        ) : (
                            <Locate size={16} className={userLocation ? 'text-sky-400' : ''} />
                        )}
                        <span className="hidden sm:inline">
                            {userLocation ? '📍 Mi Ubicación' : '📍 Cerca de Mí'}
                        </span>
                    </button>

                    {/* Filter Modal Toggle Button */}
                    <button
                        onClick={() => setShowFiltersModal(!showFiltersModal)}
                        className={`p-2.5 rounded-2xl border backdrop-blur-xl transition-all shadow-xl ${
                            selectedCategory !== 'all' || selectedTier !== 'all' || maxDistanceKm !== null || !onlyOpenRegistration
                                ? 'bg-primary text-white border-primary shadow-primary/30'
                                : 'bg-slate-900/90 text-slate-300 border-white/15 hover:bg-slate-800'
                        }`}
                        title="Filtros avanzados"
                    >
                        <Filter size={18} />
                    </button>

                    {/* Close / Back to List Button */}
                    {onCloseMap && (
                        <button
                            onClick={onCloseMap}
                            className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white p-2.5 rounded-2xl border border-white/15 backdrop-blur-xl transition-all shadow-xl"
                            title="Volver a lista"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* QUICK FILTER PILLS */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pointer-events-auto custom-scrollbar">
                    <button
                        onClick={() => setOnlyOpenRegistration(!onlyOpenRegistration)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-md ${
                            onlyOpenRegistration
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
                                : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${onlyOpenRegistration ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                        Abiertos para Inscripción
                    </button>

                    {userLocation && (
                        <button
                            onClick={() => setSortByDistance(!sortByDistance)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-md ${
                                sortByDistance
                                    ? 'bg-sky-500/20 text-sky-400 border-sky-400/40'
                                    : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white'
                            }`}
                        >
                            <Navigation size={12} className={sortByDistance ? 'rotate-45' : ''} />
                            Más cercanos a mí
                        </button>
                    )}

                    {/* Category quick selectors */}
                    {['all', '1ra', '2da', '3ra', '4ta', '5ta', 'Open'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${
                                selectedCategory === cat
                                    ? 'bg-primary text-white border-primary shadow-primary/20'
                                    : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white'
                            }`}
                        >
                            {cat === 'all' ? 'Todas Cat.' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* ADVANCED FILTER MODAL / DROPDOWN */}
            {showFiltersModal && (
                <div className="absolute top-20 right-4 z-[550] w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 animate-fade-in text-white">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2 font-extrabold text-sm">
                            <Filter size={16} className="text-primary" /> Filtros del Mapa
                        </div>
                        <button
                            onClick={() => setShowFiltersModal(false)}
                            className="text-slate-400 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Distance Radius */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-2">
                            Radio de Distancia {userLocation ? '' : '(Requiere GPS)'}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {RADIUS_OPTIONS.map((r) => (
                                <button
                                    key={r.label}
                                    onClick={() => setMaxDistanceKm(r.value)}
                                    className={`py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all ${
                                        maxDistanceKm === r.value
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                            : 'bg-slate-800/80 text-slate-300 border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tier Filter */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-2">
                            Circuito / Tier ATP
                        </label>
                        <select
                            value={selectedTier}
                            onChange={(e) => setSelectedTier(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">Todos los Tiers</option>
                            <option value="challenger">Challenger</option>
                            <option value="250">Smash 250</option>
                            <option value="500">Smash 500</option>
                            <option value="1000">Smash 1000</option>
                            <option value="masters">Master Final</option>
                        </select>
                    </div>

                    {/* Reset Filters */}
                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setOnlyOpenRegistration(true);
                                setSelectedCategory('all');
                                setSelectedTier('all');
                                setMaxDistanceKm(null);
                                setSortByDistance(false);
                            }}
                            className="text-xs text-slate-400 hover:text-red-400 underline font-semibold"
                        >
                            Restablecer filtros
                        </button>
                        <button
                            onClick={() => setShowFiltersModal(false)}
                            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-primary/20"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
            )}

            {/* MAP CANVAS CONTAINER */}
            <div ref={mapContainerRef} className="w-full flex-1 z-10" />

            {/* GPS STATUS TOAST BAR */}
            {gpsStatusMessage && (
                <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/90 backdrop-blur-md border border-sky-400/30 text-sky-300 text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 pointer-events-none animate-fade-in">
                    <span>📍 {gpsStatusMessage}</span>
                </div>
            )}

            {/* MINIMAL BOTTOM FLOATING COUNTER */}
            <div className="absolute bottom-4 left-4 z-[500] pointer-events-none">
                <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/15 text-xs font-bold text-white shadow-2xl pointer-events-auto">
                    <Trophy size={15} className="text-primary" />
                    <span>
                        {processedTournaments.length}{' '}
                        {processedTournaments.length === 1 ? 'torneo disponible' : 'torneos disponibles'}
                    </span>
                </div>
            </div>
        </div>
    );
};

