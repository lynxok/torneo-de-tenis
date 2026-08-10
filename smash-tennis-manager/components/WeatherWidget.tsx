import React, { useEffect, useState, useRef } from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, Eye, Sparkles, RefreshCw, Thermometer } from 'lucide-react';
import gsap from 'gsap';

interface WeatherData {
    temp: number;
    condition: string;
    sensation: number;
    uvIndex: string;
    windSpeed: number;
    windGusts: number;
    precipitation: number;
    humidity: number;
    clouds: number;
    visibility: number;
    forecast: Array<{
        day: string;
        tempMax: number;
        tempMin: number;
        wind: number;
        rainProb: number;
        icon: 'sun' | 'cloud-sun' | 'rain' | 'cloud';
    }>;
}

export const WeatherWidget: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pulseRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch real weather data from Open-Meteo for Diamante, Entre Ríos (-32.0664, -60.6384)
        const fetchWeather = async () => {
            try {
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=-32.0664&longitude=-60.6384&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max&timezone=America%2FArgentina%2FBuenos_Aires'
                );
                const data = await response.json();

                const current = data.current;
                const daily = data.daily;

                const mappedForecast = daily.time.slice(0, 5).map((t: string, i: number) => {
                    const d = new Date(t + 'T00:00:00');
                    const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-AR', { weekday: 'short' });
                    const code = daily.weather_code[i];

                    let icon: 'sun' | 'cloud-sun' | 'rain' | 'cloud' = 'sun';
                    if (code > 0 && code <= 3) icon = 'cloud-sun';
                    else if (code > 3 && code < 60) icon = 'cloud';
                    else if (code >= 60) icon = 'rain';

                    return {
                        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
                        tempMax: Math.round(daily.temperature_2m_max[i]),
                        tempMin: Math.round(daily.temperature_2m_min[i]),
                        wind: Math.round(daily.wind_speed_10m_max[i]),
                        rainProb: daily.precipitation_sum[i],
                        icon
                    };
                });

                setWeather({
                    temp: Math.round(current.temperature_2m),
                    condition: current.weather_code <= 2 ? 'Soleado' : current.weather_code <= 50 ? 'Parcialmente Nublado' : 'Lluvias',
                    sensation: Math.round(current.apparent_temperature),
                    uvIndex: daily.uv_index_max[0] > 7 ? 'Alto' : daily.uv_index_max[0] > 4 ? 'Moderado' : 'Bajo',
                    windSpeed: Math.round(current.wind_speed_10m),
                    windGusts: Math.round(current.wind_gusts_10m),
                    precipitation: current.precipitation,
                    humidity: current.relative_humidity_2m,
                    clouds: current.cloud_cover,
                    visibility: 10,
                    forecast: mappedForecast
                });
            } catch (err) {
                console.error("Error cargando clima real:", err);
                setWeather({
                    temp: 18,
                    condition: 'Soleado',
                    sensation: 17,
                    uvIndex: 'Moderado',
                    windSpeed: 15,
                    windGusts: 18,
                    precipitation: 0,
                    humidity: 48,
                    clouds: 10,
                    visibility: 10,
                    forecast: [
                        { day: 'Hoy', tempMax: 18, tempMin: 10, wind: 15, rainProb: 0, icon: 'sun' },
                        { day: 'Mañana', tempMax: 20, tempMin: 11, wind: 18, rainProb: 0, icon: 'sun' },
                        { day: 'Miércoles', tempMax: 15, tempMin: 9, wind: 22, rainProb: 4.2, icon: 'rain' },
                        { day: 'Jueves', tempMax: 16, tempMin: 8, wind: 14, rainProb: 0.5, icon: 'cloud-sun' },
                        { day: 'Viernes', tempMax: 21, tempMin: 12, wind: 12, rainProb: 0, icon: 'sun' }
                    ]
                });
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, []);

    // Smooth Entrance GSAP & Subtle Pulsing
    useEffect(() => {
        if (!loading && weather && containerRef.current) {
            gsap.fromTo(
                containerRef.current,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );

            if (pulseRef.current) {
                gsap.to(pulseRef.current, {
                    scale: 1.15,
                    opacity: 0.7,
                    duration: 2,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut'
                });
            }
        }
    }, [loading, weather]);

    if (loading) {
        return (
            <div className="bg-card border border-white/10 rounded-2xl p-5 flex items-center justify-center gap-3 text-muted animate-pulse">
                <RefreshCw className="animate-spin text-primary" size={18} />
                <span className="text-xs font-bold">Cargando clima en Diamante...</span>
            </div>
        );
    }

    if (!weather) return null;

    const isGoodForTennis = weather.precipitation < 1 && weather.windSpeed < 25;

    return (
        <div
            ref={containerRef}
            className="bg-card border border-white/10 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden"
        >
            {/* Header: Title & Badge */}
            <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                        <Sun size={16} className="text-amber-400 shrink-0" /> Clima en Diamante
                    </h3>
                    <span className="text-[10px] text-muted">Entre Ríos • Apto al aire libre</span>
                </div>

                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border shrink-0 ${isGoodForTennis ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                    <div ref={pulseRef} className={`w-1.5 h-1.5 rounded-full ${isGoodForTennis ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                    {isGoodForTennis ? 'Óptimo para Jugar' : 'Precaución'}
                </div>
            </div>

            {/* Main Temperature & Key Metrics */}
            <div className="flex items-center justify-between bg-black/30 p-3.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-white tracking-tight">{weather.temp}°C</div>
                    <div className="text-xs">
                        <div className="font-bold text-slate-200">{weather.condition}</div>
                        <div className="text-[10px] text-muted">Sensación: {weather.sensation}°C</div>
                    </div>
                </div>

                <div className="flex gap-3 text-[11px] text-slate-300">
                    <div className="flex items-center gap-1">
                        <Wind size={13} className="text-primary" />
                        <span>{weather.windSpeed} km/h</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Droplets size={13} className="text-blue-400" />
                        <span>{weather.humidity}%</span>
                    </div>
                </div>
            </div>

            {/* 5-Day Compact Forecast */}
            <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Pronóstico Semanal</div>
                {weather.forecast.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs hover:bg-white/10 transition-colors"
                    >
                        <span className="font-medium text-white w-16 text-[11px]">{item.day}</span>
                        
                        <div className="flex items-center gap-1.5 text-amber-400">
                            {item.icon === 'sun' && <Sun size={14} />}
                            {item.icon === 'cloud-sun' && <Cloud size={14} className="text-slate-300" />}
                            {item.icon === 'rain' && <CloudRain size={14} className="text-blue-400" />}
                            <span className="text-[11px] text-slate-200 font-bold">{item.tempMax}°C</span>
                            <span className="text-[9px] text-muted font-normal">/{item.tempMin}°C</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-slate-400 flex items-center gap-0.5">
                                <Wind size={11} /> {item.wind} km/h
                            </span>
                            {item.rainProb > 0 && (
                                <span className="font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 text-[9px]">
                                    {item.rainProb} mm
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
