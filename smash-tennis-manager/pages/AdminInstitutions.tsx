
import React, { useEffect, useState } from 'react';
import { Institution, UserProfile } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { 
    Building, MapPin, Plus, Lightbulb, Sun, X, Save, 
    Instagram, Globe, Phone, Mail, Car, Wifi, Utensils, Droplets, ShoppingBag, Clock, ShieldCheck,
    ArrowRightLeft, Layers, Info, Award
} from 'lucide-react';
import { CATEGORY_EQUIVALENCES } from '../utils/categories';

interface AdminInstitutionsProps {
    user?: UserProfile;
}

export const AdminInstitutions: React.FC<AdminInstitutionsProps> = ({ user }) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Institution>>({});
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (user) {
        loadInstitutions();
    }
  }, [user]);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
        const allData = await api.institutions.getAll();
        
        if (user?.role === 'superadmin') {
            // Superadmin sees all
            setInstitutions(allData);
        } else if (user?.institution_id) {
            // Admin/Professor sees only their institution
            const myInst = allData.filter(i => i.id === user.institution_id);
            setInstitutions(myInst);
        } else {
            // Admin without institution?
            setInstitutions([]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Max Slots
    if (formData.config_max_booking_slots && (formData.config_max_booking_slots < 1 || formData.config_max_booking_slots > 4)) {
        alert("El máximo de turnos debe estar entre 1 y 4.");
        return;
    }

    try {
        if (formData.id) {
            await api.institutions.update(formData.id, formData);
        } else {
            await api.institutions.create(formData);
        }
        setShowModal(false);
        setFormData({});
        loadInstitutions();
    } catch (err: any) {
        alert('Error al guardar: ' + err.message);
    }
  };

  const openEdit = (inst: Institution) => {
      setFormData(inst);
      setActiveTab('general');
      setShowModal(true);
  };

  const openNew = () => {
      setFormData({
          courts_with_light: 0,
          courts_without_light: 0,
          amenities: [],
          config_booking_min_duration: 60,
          config_match_duration_3_sets: 90,
          config_match_duration_5_sets: 150,
          config_max_booking_slots: 4
      });
      setActiveTab('general');
      setShowModal(true);
  };

  const toggleAmenity = (key: string) => {
      const current = formData.amenities || [];
      if (current.includes(key)) {
          setFormData({ ...formData, amenities: current.filter(k => k !== key) });
      } else {
          setFormData({ ...formData, amenities: [...current, key] });
      }
  };

  const getAmenityIcon = (key: string) => {
      switch(key) {
          case 'parking': return <Car size={14} />;
          case 'wifi': return <Wifi size={14} />;
          case 'buffet': return <Utensils size={14} />;
          case 'showers': return <Droplets size={14} />;
          case 'shop': return <ShoppingBag size={14} />;
          default: return null;
      }
  };

  const getAmenityLabel = (key: string) => {
    switch(key) {
        case 'parking': return 'Estacionamiento';
        case 'wifi': return 'WiFi';
        case 'buffet': return 'Buffet/Bar';
        case 'showers': return 'Vestuarios';
        case 'shop': return 'Tienda';
        default: return key;
    }
  };

  // Helper for inputs
  const InputNumber = ({ label, value, onChange }: any) => (
      <div className="space-y-1">
          <label className="text-[10px] text-muted uppercase font-bold">{label}</label>
          <input type="number" className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-center font-bold"
              value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} min={0} />
      </div>
  );

  // Helper for tabs
  const TabButton = ({ id, label, active, onClick }: any) => (
      <button 
          type="button"
          onClick={() => onClick(id)}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${active ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}
      >
          {label}
      </button>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white">Instituciones</h2>
           <p className="text-muted text-sm">
               {user?.role === 'superadmin' 
                ? 'Administración de clubes, canchas y sedes deportivas' 
                : 'Configuración de mi sede deportiva'}
           </p>
        </div>
        
        {/* Only Superadmin can create new institutions */}
        {user?.role === 'superadmin' && (
            <button 
              onClick={openNew}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={18} /> Nueva Sede
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {loading ? (
             <div className="col-span-full text-center text-muted py-20">Cargando instituciones...</div>
         ) : institutions.length === 0 ? (
             <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-2xl text-muted">
                 No tienes instituciones asignadas. Contacta al soporte.
             </div>
         ) : institutions.map(inst => (
             <Card key={inst.id} className="group relative overflow-hidden flex flex-col h-full p-0 border border-white/10 bg-card">
                
                {/* Edit Button - Floating Top Right */}
                <div className="absolute top-4 right-4 z-10">
                    <button id="inst-edit-btn" onClick={() => openEdit(inst)} className="bg-black/40 hover:bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur border border-white/10 transition-colors">
                        Editar
                    </button>
                </div>

                <div className="p-6 flex flex-col flex-1">
                    {/* Header: Logo + Name */}
                    <div className="flex items-start gap-4 mb-6">
                         <div className="w-16 h-16 rounded-2xl bg-dark border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                             {inst.logo_url ? (
                                 <img src={inst.logo_url} alt="Logo" className="w-full h-full object-cover" />
                             ) : (
                                 <Building className="text-muted" size={28} />
                             )}
                         </div>
                         <div className="pt-1 pr-12">
                             <h3 className="font-bold text-white text-xl leading-tight mb-1">{inst.name}</h3>
                             <div className="flex items-center gap-1.5 text-xs text-muted">
                                 <MapPin size={12} className="text-primary" /> {inst.city}
                             </div>
                         </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-5 flex-1">
                        {/* Courts Grid */}
                        <div className="grid grid-cols-2 gap-3" id="courts-grid">
                             <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5 hover:border-white/10 transition-colors">
                                 <span className="block font-bold text-white text-2xl mb-1">{inst.courts_with_light || 0}</span>
                                 <span className="text-muted text-[10px] uppercase font-bold tracking-wider">Con Luz</span>
                             </div>
                             <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5 hover:border-white/10 transition-colors">
                                 <span className="block font-bold text-white text-2xl mb-1">{inst.courts_without_light || 0}</span>
                                 <span className="text-muted text-[10px] uppercase font-bold tracking-wider">Sin Luz</span>
                             </div>
                        </div>
                        
                        {/* Address Line */}
                        {inst.address && (
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-sm text-slate-400 flex items-start gap-2">
                                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></span>
                                  {inst.address}
                                </p>
                            </div>
                        )}

                        {/* Amenities */}
                        {inst.amenities && inst.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {inst.amenities.map(key => (
                                    <div key={key} className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center border border-white/5 hover:text-white hover:bg-white/10 transition-colors" title={getAmenityLabel(key)}>
                                        {getAmenityIcon(key)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-end">
                        <div className="flex gap-2">
                             {inst.instagram && <a href={inst.instagram} target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-pink-500/10 hover:text-pink-400 text-muted transition-colors"><Instagram size={18} /></a>}
                             {inst.email && <a href={`mailto:${inst.email}`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-500/10 hover:text-blue-400 text-muted transition-colors"><Mail size={18} /></a>}
                        </div>
                        <div className="text-right">
                             <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Desde</span>
                             <span className="font-bold text-primary font-mono text-xl">${inst.price_day || 0}</span>
                        </div>
                    </div>
                </div>
             </Card>
         ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh]" id="inst-modal">
                
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-bold text-white">{formData.id ? 'Editar Institución' : 'Nueva Institución'}</h3>
                    <button onClick={() => setShowModal(false)} className="text-muted hover:text-white"><X size={20}/></button>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-white/10 px-5 bg-white/5" id="inst-form-tabs">
                    <TabButton id="general" label="General" active={activeTab === 'general'} onClick={setActiveTab} />
                    <TabButton id="location" label="Ubicación" active={activeTab === 'location'} onClick={setActiveTab} />
                    <TabButton id="facilities" label="Instalaciones & Valores" active={activeTab === 'facilities'} onClick={setActiveTab} />
                    <TabButton id="media" label="Configuración" active={activeTab === 'media'} onClick={setActiveTab} />
                </div>

                {/* Form Body */}
                <form id="inst-form" onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6">
                    {/* ... Form Content (unchanged) ... */}
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Nombre del Club *</label>
                                <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                    value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ej: Club Tenis Central" />
                            </div>
                             <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Descripción</label>
                                <textarea className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary resize-none h-24" 
                                    value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Breve reseña del club..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center gap-2"><Phone size={12}/> Teléfono</label>
                                    <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center gap-2"><Mail size={12}/> Email</label>
                                    <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'location' && (
                        <div className="space-y-4">
                             <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Dirección Completa</label>
                                <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                    value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Ej: Av. Libertador 1234" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Ciudad</label>
                                    <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Provincia</label>
                                    <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={formData.province || ''} onChange={e => setFormData({...formData, province: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold flex items-center gap-2"><MapPin size={12}/> Google Maps Link</label>
                                <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-sm" 
                                    value={formData.maps_url || ''} onChange={e => setFormData({...formData, maps_url: e.target.value})} placeholder="https://maps.google.com/..." />
                            </div>
                        </div>
                    )}

                    {activeTab === 'facilities' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-white mb-3">Cantidad de Canchas</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <InputNumber label="Total" value={formData.courts_total} onChange={v => setFormData({...formData, courts_total: v})} />
                                    <InputNumber label="Polvo" value={formData.courts_clay} onChange={v => setFormData({...formData, courts_clay: v})} />
                                    <InputNumber label="Cemento" value={formData.courts_hard} onChange={v => setFormData({...formData, courts_hard: v})} />
                                    <InputNumber label="Indoor" value={formData.courts_indoor} onChange={v => setFormData({...formData, courts_indoor: v})} />
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">Disponibilidad Horaria</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-muted uppercase font-bold">Apertura</label>
                                        <input type="time" className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-center"
                                            value={formData.schedule_open || '08:00'} onChange={e => setFormData({...formData, schedule_open: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-muted uppercase font-bold">Cierre</label>
                                        <input type="time" className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-center"
                                            value={formData.schedule_close || '23:00'} onChange={e => setFormData({...formData, schedule_close: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-blue-300 uppercase font-bold">Inicio Noche</label>
                                        <input type="time" className="w-full bg-sidebar border border-blue-500/30 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-center"
                                            value={formData.schedule_night_start || '18:00'} onChange={e => setFormData({...formData, schedule_night_start: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-white/10 pt-4">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Clock size={16} className="text-primary" /> Configuración de Tiempos
                                </h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <InputNumber label="Mejor de 3 (min)" value={formData.config_match_duration_3_sets || 90} onChange={v => setFormData({...formData, config_match_duration_3_sets: v})} />
                                    <InputNumber label="Mejor de 5 (min)" value={formData.config_match_duration_5_sets || 150} onChange={v => setFormData({...formData, config_match_duration_5_sets: v})} />
                                    <InputNumber label="Turno Mínimo (min)" value={formData.config_booking_min_duration || 60} onChange={v => setFormData({...formData, config_booking_min_duration: v})} />
                                    <InputNumber label="Máx. Turnos/Reserva" value={formData.config_max_booking_slots || 4} onChange={v => setFormData({...formData, config_max_booking_slots: v})} />
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">Tarifas y Valores de Cancha</h4>
                                
                                <div className="space-y-3 mb-4">
                                    <div className="text-xs font-bold text-muted uppercase">Tarifa General (Invitados / No Socios)</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-muted text-xs">$</span>
                                            <input type="number" className="w-full bg-sidebar border border-white/10 rounded-xl pl-6 p-3 text-white focus:outline-none focus:border-primary text-sm" 
                                                value={formData.price_day || ''} onChange={e => setFormData({...formData, price_day: parseInt(e.target.value)})} placeholder="Precio Día" />
                                            <div className="text-[10px] text-muted mt-1 text-center">Hora Diurna (Invitado)</div>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-muted text-xs">$</span>
                                            <input type="number" className="w-full bg-sidebar border border-white/10 rounded-xl pl-6 p-3 text-white focus:outline-none focus:border-primary text-sm" 
                                                value={formData.price_night || ''} onChange={e => setFormData({...formData, price_night: parseInt(e.target.value)})} placeholder="Precio Noche" />
                                            <div className="text-[10px] text-muted mt-1 text-center">Hora Nocturna (Invitado)</div>
                                        </div>
                                    </div>

                                    <div className="text-xs font-bold text-primary uppercase pt-2 flex items-center gap-1.5">
                                        <Award size={14} /> Tarifa Preferencial para Socios Oficiales
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-primary/5 p-3 rounded-xl border border-primary/20">
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-primary text-xs">$</span>
                                            <input type="number" className="w-full bg-sidebar border border-primary/30 rounded-xl pl-6 p-3 text-white focus:outline-none focus:border-primary text-sm font-semibold" 
                                                value={formData.price_member_day || ''} onChange={e => setFormData({...formData, price_member_day: parseInt(e.target.value)})} placeholder="Precio Socio Día" />
                                            <div className="text-[10px] text-primary mt-1 text-center">Hora Diurna (Socio)</div>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-primary text-xs">$</span>
                                            <input type="number" className="w-full bg-sidebar border border-primary/30 rounded-xl pl-6 p-3 text-white focus:outline-none focus:border-primary text-sm font-semibold" 
                                                value={formData.price_member_night || ''} onChange={e => setFormData({...formData, price_member_night: parseInt(e.target.value)})} placeholder="Precio Socio Noche" />
                                            <div className="text-[10px] text-primary mt-1 text-center">Hora Nocturna (Socio)</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-3 rounded-xl border transition-all ${formData.allow_racket_rental ? 'bg-white/5 border-white/10' : 'bg-sidebar border-white/5 opacity-80'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] text-muted uppercase font-bold">Alquiler Raqueta</span>
                                            <input type="checkbox" className="w-4 h-4 accent-primary cursor-pointer" checked={!!formData.allow_racket_rental} onChange={e => setFormData({...formData, allow_racket_rental: e.target.checked})} />
                                        </div>
                                        {formData.allow_racket_rental && (
                                            <div className="relative animate-in fade-in slide-in-from-top-1">
                                                <span className="absolute left-3 top-2 text-muted text-xs">$</span>
                                                <input type="number" className="w-full bg-black/20 border border-white/10 rounded-lg pl-6 p-2 text-white text-sm focus:outline-none focus:border-primary" 
                                                    value={formData.price_racket || ''} onChange={e => setFormData({...formData, price_racket: parseInt(e.target.value)})} placeholder="Precio" />
                                            </div>
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-xl border transition-all ${formData.allow_ball_rental ? 'bg-white/5 border-white/10' : 'bg-sidebar border-white/5 opacity-80'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] text-muted uppercase font-bold">Tubo Pelotas</span>
                                            <input type="checkbox" className="w-4 h-4 accent-primary cursor-pointer" checked={!!formData.allow_ball_rental} onChange={e => setFormData({...formData, allow_ball_rental: e.target.checked})} />
                                        </div>
                                        {formData.allow_ball_rental && (
                                            <div className="relative animate-in fade-in slide-in-from-top-1">
                                                <span className="absolute left-3 top-2 text-muted text-xs">$</span>
                                                <input type="number" className="w-full bg-black/20 border border-white/10 rounded-lg pl-6 p-2 text-white text-sm focus:outline-none focus:border-primary" 
                                                    value={formData.price_ball || ''} onChange={e => setFormData({...formData, price_ball: parseInt(e.target.value)})} placeholder="Precio" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <h4 className="text-sm font-bold text-white mb-3">Servicios / Amenities</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {['parking', 'buffet', 'wifi', 'showers', 'shop'].map(key => (
                                        <div key={key} onClick={() => toggleAmenity(key)}
                                            className={`cursor-pointer flex items-center gap-2 p-3 rounded-xl border transition-all ${(formData.amenities || []).includes(key) ? 'bg-primary/20 border-primary text-white' : 'bg-sidebar border-white/10 text-muted hover:bg-white/5'}`}>
                                            <div className={ (formData.amenities || []).includes(key) ? "text-primary" : "text-muted" }>{getAmenityIcon(key)}</div>
                                            <span className="text-xs font-bold">{getAmenityLabel(key)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Logo URL</label>
                                <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-sm" 
                                    value={formData.logo_url || ''} onChange={e => setFormData({...formData, logo_url: e.target.value})} placeholder="https://..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Imagen de Portada URL</label>
                                <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-sm" 
                                    value={formData.cover_url || ''} onChange={e => setFormData({...formData, cover_url: e.target.value})} placeholder="https://..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold flex items-center gap-2"><Instagram size={12}/> Instagram</label>
                                <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-sm" 
                                    value={formData.instagram || ''} onChange={e => setFormData({...formData, instagram: e.target.value})} placeholder="https://instagram.com/..." />
                            </div>

                            <div className="border-t border-white/10 pt-4 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                                        <Layers size={14} className="text-primary" /> Sistema de Categorías del Club
                                    </label>
                                    <select 
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-sm font-medium"
                                        value={formData.category_system || 'numeric'}
                                        onChange={e => setFormData({...formData, category_system: e.target.value as any})}
                                    >
                                        <option value="numeric">Tradicional / Numérico (1ra, 2da, 3ra, 4ta, 5ta, 6ta, 7ma, Open)</option>
                                        <option value="letters">Por Letras y Subniveles (A1, A2, B1, B2, C1, C2, D1, D2, Open)</option>
                                    </select>
                                    <p className="text-[11px] text-muted">Define cómo se etiquetan y muestran las categorías de torneos y jugadores para este club.</p>
                                </div>

                                {/* TABLA DE EQUIVALENCIAS VISUAL */}
                                <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3 mt-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ArrowRightLeft size={16} className="text-primary" />
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Matriz de Equivalencias de Categorías</span>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                                            Modo activo: {(formData.category_system || 'numeric') === 'numeric' ? 'Numérico' : 'Letras'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        Esta tabla permite que jugadores y torneos de diferentes clubes compitan y rankeen de forma estandarizada:
                                    </p>
                                    <div className="overflow-x-auto rounded-lg border border-white/5">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-white/5 text-muted uppercase font-bold text-[10px]">
                                                <tr>
                                                    <th className="py-2.5 px-3">Nivel</th>
                                                    <th className={`py-2.5 px-3 ${(formData.category_system || 'numeric') === 'numeric' ? 'text-primary bg-primary/10 font-black' : ''}`}>
                                                        Sistema Numérico {(formData.category_system || 'numeric') === 'numeric' && '✓'}
                                                    </th>
                                                    <th className={`py-2.5 px-3 ${(formData.category_system || 'numeric') === 'letters' ? 'text-primary bg-primary/10 font-black' : ''}`}>
                                                        Sistema por Letras {(formData.category_system || 'numeric') === 'letters' && '✓'}
                                                    </th>
                                                    <th className="py-2.5 px-3 text-right">Referencia</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-slate-300">
                                                {CATEGORY_EQUIVALENCES.map((eq) => {
                                                    const isNumActive = (formData.category_system || 'numeric') === 'numeric';
                                                    const isLetActive = (formData.category_system || 'numeric') === 'letters';
                                                    return (
                                                        <tr key={eq.rank} className="hover:bg-white/5 transition-colors">
                                                            <td className="py-2 px-3 font-mono font-bold text-slate-400">
                                                                {eq.rank === 99 ? 'OPEN' : `#${eq.rank}`}
                                                            </td>
                                                            <td className={`py-2 px-3 ${isNumActive ? 'bg-primary/5 font-bold text-white' : ''}`}>
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/10 text-white font-medium">
                                                                    {eq.numeric}
                                                                </span>
                                                            </td>
                                                            <td className={`py-2 px-3 ${isLetActive ? 'bg-primary/5 font-bold text-white' : ''}`}>
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {eq.letters.map((l, i) => (
                                                                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/5 text-slate-200">
                                                                            {l}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-3 text-right text-muted text-[11px]">
                                                                {eq.label}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            {/* RESTRICTED SECTION: ONLY SUPERADMIN CAN SEE/EDIT MP TOKEN */}
                            {user?.role === 'superadmin' && (
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 mt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck size={16} className="text-amber-400" />
                                        <h4 className="text-xs font-bold text-amber-400 uppercase">Zona Segura (Superadmin)</h4>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">Token MercadoPago (Acceso)</label>
                                        <input type="password" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 text-sm font-mono" 
                                            value={formData.mp_access_token || ''} onChange={e => setFormData({...formData, mp_access_token: e.target.value})} placeholder="APP_USR-..." />
                                        <p className="text-[10px] text-muted mt-1">Credencial sensible. Solo visible para super administradores.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    <button 
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        form="inst-form"
                        type="submit" 
                        className="px-6 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                    >
                        <Save size={18} /> Guardar Cambios
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
