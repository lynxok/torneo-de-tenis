import React, { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, Info, RefreshCw } from 'lucide-react';

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

                const mappedForecast = daily.time.slice(0, 7).map((t: string, i: number) => {
                    const d = new Date(t + 'T00:00:00');
                    const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' });
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
                    temp: 13,
                    condition: 'Soleado',
                    sensation: 10,
                    uvIndex: 'Moderado',
                    windSpeed: 15,
                    windGusts: 18,
                    precipitation: 0,
                    humidity: 48,
                    clouds: 0,
                    visibility: 10,
                    forecast: [
                        { day: 'Hoy', tempMax: 13, tempMin: 4, wind: 18, rainProb: 0, icon: 'sun' },
                        { day: 'Mañana', tempMax: 13, tempMin: 6, wind: 23, rainProb: 0, icon: 'sun' },
                        { day: 'Miércoles', tempMax: 10, tempMin: 7, wind: 22, rainProb: 9.8, icon: 'rain' },
                        { day: 'Jueves', tempMax: 9, tempMin: 7, wind: 22, rainProb: 1.5, icon: 'cloud-sun' },
                        { day: 'Viernes', tempMax: 14, tempMin: 8, wind: 12, rainProb: 0.2, icon: 'cloud' }
                    ]
                });
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, []);

    if (loading) {
        return (
            <div className="bg-card border border-white/10 rounded-2xl p-6 flex items-center justify-center gap-3 text-muted animate-pulse">
                <RefreshCw className="animate-spin text-primary" size={18} />
                <span className="text-xs font-bold">Cargando el clima...</span>
            </div>
        );
    }

    if (!weather) return null;

    return (
        <div className="bg-card border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl text-white space-y-4 sm:space-y-6">
            {/* Top Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
                <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                    <Sun className="text-amber-400 shrink-0" size={22} /> Clima en Diamante
                </h3>
                <button className="text-muted hover:text-white transition-colors" title="Información meteorológica">
                    <Info size={18} />
                </button>
            </div>

            {/* Current Weather Display (Responsive Grid for Mobile, Tablet & Desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-center">
                {/* Left: Big Icon, Big Temp, Sensation & UV */}
                <div className="flex items-center gap-4 sm:gap-5">
                    <div className="p-3 sm:p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 shrink-0">
                        <Sun size={48} className="sm:w-16 sm:h-16" />
                    </div>
                    <div>
                        <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">{weather.temp}°C</div>
                        <div className="text-sm sm:text-base font-bold text-slate-200 mt-0.5">{weather.condition}</div>
                        <div className="text-xs text-muted mt-1 space-y-0.5">
                            <div>Sentimiento <strong className="text-slate-200">{weather.sensation}°C</strong></div>
                            <div>Índice UV: <strong className="text-slate-200">{weather.uvIndex}</strong></div>
                        </div>
                    </div>
                </div>

                {/* Right: Wind, Humidity, Clouds & Visibility Details - Visible on Tablet (sm:block) */}
                <div className="space-y-2 text-xs sm:border-l sm:border-white/10 sm:pl-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-2"><Wind size={15} className="text-primary shrink-0" /> Viento</span>
                        <span className="font-bold">{weather.windSpeed} km/h</span>
                    </div>
                    <div className="text-[11px] text-muted pl-6">
                        Ráfagas {weather.windGusts} km/h
                    </div>
                    <div className="flex items-center justify-between text-slate-300 pt-0.5">
                        <span className="flex items-center gap-2"><Droplets size={15} className="text-blue-400 shrink-0" /> Humedad</span>
                        <span className="font-bold">{weather.humidity}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 pt-0.5">
                        <span className="flex items-center gap-2"><Cloud size={15} className="text-slate-400 shrink-0" /> Nubes</span>
                        <span className="font-bold">{weather.clouds}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 pt-0.5">
                        <span className="flex items-center gap-2"><Info size={15} className="text-emerald-400 shrink-0" /> Visibilidad</span>
                        <span className="font-bold">{weather.visibility} km</span>
                    </div>
                </div>
            </div>

            {/* 7-Day Forecast Table (Responsive Scroll & Touch Layout for Tablet/Mobile) */}
            <div className="border-t border-white/10 pt-4">
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                    <table className="w-full text-left text-xs min-w-[500px]">
                        <tbody>
                            {weather.forecast.map((item, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    {/* Day Name */}
                                    <td className="py-2.5 sm:py-3 px-2 font-bold text-white w-28 whitespace-nowrap">{item.day}</td>

                                    {/* Weather Icon */}
                                    <td className="py-2.5 sm:py-3 px-2 text-center text-amber-400 w-12">
                                        {item.icon === 'sun' && <Sun size={20} className="mx-auto" />}
                                        {item.icon === 'cloud-sun' && <Cloud size={20} className="mx-auto text-slate-300" />}
                                        {item.icon === 'rain' && <CloudRain size={20} className="mx-auto text-blue-400" />}
                                        {item.icon === 'cloud' && <Cloud size={20} className="mx-auto text-slate-400" />}
                                    </td>

                                    {/* Temp Max */}
                                    <td className="py-2.5 sm:py-3 px-2 font-bold text-white text-sm sm:text-base text-right w-16 whitespace-nowrap">
                                        {item.tempMax}°C
                                    </td>

                                    {/* Temp Min Badge */}
                                    <td className="py-2.5 sm:py-3 px-2 w-20 whitespace-nowrap">
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold text-[10px] sm:text-[11px]">
                                            {item.tempMin}°C
                                        </span>
                                    </td>

                                    {/* Wind Speed */}
                                    <td className="py-2.5 sm:py-3 px-2 text-slate-300 text-[11px] text-right whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1">
                                            <Wind size={12} className="text-muted" /> {item.wind} km/h
                                        </span>
                                    </td>

                                    {/* Rain Precipitation */}
                                    <td className="py-2.5 sm:py-3 px-2 text-right whitespace-nowrap">
                                        {item.rainProb > 0 ? (
                                            <span className="font-bold text-red-400 text-[11px]">
                                                {item.rainProb} mm
                                            </span>
                                        ) : (
                                            <span className="text-muted text-[10px]">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
