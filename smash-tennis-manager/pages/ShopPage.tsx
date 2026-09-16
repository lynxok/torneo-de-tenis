import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Institution, ClubProduct, StoreOrder, StoreOrderItem, ProductCategory } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { 
    ShoppingBag, Plus, Minus, Trash2, CheckCircle2, CreditCard, Copy, 
    ExternalLink, X, Building, MessageCircle, Clock, Package, Sparkles,
    Utensils, Droplets, Filter, Check, ChevronRight, Phone, User, QrCode, MapPin, Share2,
    UploadCloud, Eye, AlertTriangle, Bell, DollarSign, ArrowUpRight
} from 'lucide-react';
import { formatPlayerName } from '../utils/formatters';
import { CourtQRModal } from '../components/CourtQRModal';
import { soundEffects } from '../services/soundEffects';

interface ShopPageProps {
    user: UserProfile;
    institutions?: Institution[];
}

export const ShopPage: React.FC<ShopPageProps> = ({ user, institutions: propInstitutions }) => {
    const { addToast } = useToast();
    const [institutions, setInstitutions] = useState<Institution[]>(propInstitutions || []);

    const urlParams = new URLSearchParams(window.location.search);
    const courtFromUrl = urlParams.get('court') || urlParams.get('cancha');
    const clubFromUrl = urlParams.get('club') || urlParams.get('institutionId');

    // FILTRO DE CLUBES:
    // Si es superadmin, ve todos. Si es admin/coordinator de club, ve solo el suyo.
    const isSuperAdmin = user.role === 'superadmin';
    const isClubAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'coordinator';

    const [selectedInstId, setSelectedInstId] = useState<string>(() => {
        if (clubFromUrl) return clubFromUrl;
        if (user.institution_id) return user.institution_id;
        return (propInstitutions && propInstitutions[0]?.id) || 'default';
    });

    useEffect(() => {
        if (!propInstitutions || propInstitutions.length === 0) {
            api.institutions.getAll().then(list => {
                let filteredList = list;
                if (!isSuperAdmin && user.institution_id) {
                    filteredList = list.filter(i => i.id === user.institution_id);
                }
                setInstitutions(filteredList);
                if (!selectedInstId || selectedInstId === 'default') {
                    const fallbackId = user.institution_id || (filteredList[0]?.id) || 'default';
                    setSelectedInstId(fallbackId);
                }
            }).catch(console.error);
        } else if (!isSuperAdmin && user.institution_id) {
            setInstitutions(propInstitutions.filter(i => i.id === user.institution_id));
        }
    }, [propInstitutions, user.institution_id, isSuperAdmin]);

    const [detectedCourt, setDetectedCourt] = useState<string | null>(courtFromUrl);
    const [showCourtQRModal, setShowCourtQRModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [products, setProducts] = useState<ClubProduct[]>([]);
    const [reservedStockMap, setReservedStockMap] = useState<{ [productId: string]: number }>({});
    const [loading, setLoading] = useState(true);

    // Cart State
    const [cart, setCart] = useState<{ [productId: string]: { product: ClubProduct; quantity: number } }>({});
    const [showCartDrawer, setShowCartDrawer] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [orderConfirmed, setOrderConfirmed] = useState<StoreOrder | null>(null);

    // Reserva Virtual Temporal (15 min)
    const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
    const [reservationSecondsLeft, setReservationSecondsLeft] = useState<number>(15 * 60);

    // Checkout Form & Comprobante
    const [customerName, setCustomerName] = useState(() => formatPlayerName(user.name, user.lastname));
    const [customerPhone, setCustomerPhone] = useState(() => user.phone || '');
    const [customerNotes, setCustomerNotes] = useState(() => courtFromUrl ? `Cancha ${courtFromUrl}` : '');
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [submittingOrder, setSubmittingOrder] = useState(false);
    const [transferInitiated, setTransferInitiated] = useState(false);

    // Admin Mode (for club admins & superadmins)
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminOrders, setAdminOrders] = useState<StoreOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [adminTab, setAdminTab] = useState<'products' | 'orders'>('orders');

    // Live Order Alert (Pop-up en vivo con sonido)
    const [liveIncomingOrder, setLiveIncomingOrder] = useState<StoreOrder | null>(null);
    const lastOrderCountRef = useRef<number>(0);

    // Modal de Comprobante en Grande
    const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

    // Add / Edit Product Modal
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<ClubProduct>>({
        category: 'balls',
        price: 10000,
        is_available: true,
        stock: 50
    });

    // Reabastecimiento de Stock (Restock Modal)
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [restockingProduct, setRestockingProduct] = useState<ClubProduct | null>(null);
    const [restockUnits, setRestockUnits] = useState<number>(10);
    const [restockMode, setRestockMode] = useState<'unit' | 'total'>('unit');
    const [restockUnitCost, setRestockUnitCost] = useState<number>(0);
    const [restockTotalCost, setRestockTotalCost] = useState<number>(0);
    const [recordExpenseInCash, setRecordExpenseInCash] = useState<boolean>(true);
    const [submittingRestock, setSubmittingRestock] = useState(false);

    const activeInstitution = institutions.find(i => i.id === selectedInstId) || institutions[0];

    useEffect(() => {
        loadProducts();
        loadReservedStock();
    }, [selectedInstId]);

    // Timer de la Reserva Temporal (15 Minutos)
    useEffect(() => {
        let timer: any = null;
        if (showCheckoutModal && reservationSecondsLeft > 0) {
            timer = setInterval(() => {
                setReservationSecondsLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleReservationExpired();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [showCheckoutModal, reservationSecondsLeft]);

    // Polling en tiempo real para alertar al organizador si entra un pedido con comprobante
    useEffect(() => {
        if (!isClubAdmin) return;
        const interval = setInterval(async () => {
            try {
                const orders = await api.shop.getOrders(selectedInstId);
                // Si hay nuevos pedidos confirmados detectados
                if (lastOrderCountRef.current > 0 && orders.length > lastOrderCountRef.current) {
                    const newest = orders[0];
                    if (newest && newest.receipt_url) {
                        setLiveIncomingOrder(newest);
                        try {
                            soundEffects.playNotificationPop();
                        } catch (e) {}
                    }
                }
                lastOrderCountRef.current = orders.length;
                setAdminOrders(orders);
            } catch (e) {}
        }, 10000);

        return () => clearInterval(interval);
    }, [isClubAdmin, selectedInstId]);

    const handleReservationExpired = () => {
        if (activeReservationId) {
            api.shop.cancelReservation(selectedInstId, activeReservationId);
            setActiveReservationId(null);
        }
        setShowCheckoutModal(false);
        setReceiptImage(null);
        loadReservedStock();
        addToast("⏱️ El tiempo de reserva de 15 minutos expiró. Los productos fueron devueltos al stock general.", "error");
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await api.shop.getProducts(selectedInstId);
            setProducts(data);
        } catch (e) {
            console.error("Error loading products:", e);
        } finally {
            setLoading(false);
        }
    };

    const loadReservedStock = async () => {
        try {
            const resMap = await api.shop.getReservedStockMap(selectedInstId);
            setReservedStockMap(resMap);
        } catch (e) {}
    };

    const loadOrders = async () => {
        setLoadingOrders(true);
        try {
            const data = await api.shop.getOrders(selectedInstId);
            setAdminOrders(data);
            lastOrderCountRef.current = data.length;
        } catch (e) {
            console.error("Error loading orders:", e);
        } finally {
            setLoadingOrders(false);
        }
    };

    // Calcular stock efectivo restando reservas activas
    const getAvailableStock = (product: ClubProduct) => {
        const rawStock = typeof product.stock === 'number' ? product.stock : 10;
        const reserved = reservedStockMap[product.id] || 0;
        return Math.max(0, rawStock - reserved);
    };

    // Cart Helpers con validación estricta de Stock
    const addToCart = (product: ClubProduct) => {
        const available = getAvailableStock(product);
        const currentQty = cart[product.id]?.quantity || 0;

        if (available <= 0) {
            addToast(`"${product.name}" está momentáneamente agotado o reservado`, "error");
            return;
        }
        if (currentQty + 1 > available) {
            addToast(`No hay más stock disponible de ${product.name} (Stock libre: ${available})`, "error");
            return;
        }

        setCart(prev => ({
            ...prev,
            [product.id]: {
                product,
                quantity: currentQty + 1
            }
        }));
        addToast(`+1 ${product.name} agregado al carrito`, "success");
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const copy = { ...prev };
            delete copy[productId];
            return copy;
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            const item = prev[productId];
            if (!item) return prev;
            const newQty = item.quantity + delta;
            if (newQty <= 0) {
                const copy = { ...prev };
                delete copy[productId];
                return copy;
            }
            const available = getAvailableStock(item.product);
            if (delta > 0 && newQty > available) {
                addToast(`Límite de stock alcanzado (${available} disponibles)`, "error");
                return prev;
            }
            return {
                ...prev,
                [productId]: {
                    ...item,
                    quantity: newQty
                }
            };
        });
    };

    const handleStartCheckout = async () => {
        if (cartItems.length === 0) return;
        // Iniciar reserva virtual de 15 minutos
        try {
            const resId = await api.shop.reserveStock(
                selectedInstId,
                cartItems.map(ci => ({
                    product_id: ci.product.id,
                    product_name: ci.product.name,
                    price: ci.product.price,
                    quantity: ci.quantity,
                    image_url: ci.product.image_url
                })),
                customerName
            );
            setActiveReservationId(resId);
            setReservationSecondsLeft(15 * 60);
            loadReservedStock();
        } catch (e) {}

        setShowCartDrawer(false);
        setShowCheckoutModal(true);
    };

    // Subida y compresión ligera de comprobante
    const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            addToast("El comprobante debe ser menor a 10 MB", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const scale = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
                    setReceiptImage(compressedDataUrl);
                    addToast("¡Comprobante adjuntado con éxito!", "success");
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const cartItems = Object.values(cart) as { product: ClubProduct; quantity: number }[];
    const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalAmount = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    // Category Filter
    const filteredProducts = products.filter(p => {
        if (activeCategory === 'all') return true;
        if (activeCategory === 'balls_acc') return p.category === 'balls' || p.category === 'accessories';
        return p.category === activeCategory;
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
    };

    const handleCopyAlias = () => {
        const alias = activeInstitution?.alias_mp || 'parqueespana.tenis';
        navigator.clipboard.writeText(alias);
        addToast(`¡Alias "${alias}" copiado al portapapeles!`, "success");
    };

    const handleOpenMercadoPago = () => {
        handleCopyAlias();
        setTransferInitiated(true);
        // Official MP Transfer URL or deep link
        const mpUrl = "https://www.mercadopago.com.ar/transfer/account-finder?preference_id=transfer-mla-desktop&workflow_id=ars_transfer";
        window.open(mpUrl, '_blank', 'noopener,noreferrer');
    };

    const handleConfirmOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cartItems.length === 0) return;

        if (!receiptImage) {
            addToast("⚠️ Debes adjuntar la foto o captura del comprobante para confirmar el pedido", "error");
            return;
        }

        setSubmittingOrder(true);
        try {
            const orderItems: StoreOrderItem[] = cartItems.map(ci => ({
                product_id: ci.product.id,
                product_name: ci.product.name,
                price: ci.product.price,
                quantity: ci.quantity,
                image_url: ci.product.image_url
            }));

            const newOrder = await api.shop.createOrder({
                institution_id: selectedInstId,
                institution_name: activeInstitution?.name || 'Club de Tenis',
                user_id: user.id,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_notes: customerNotes,
                items: orderItems,
                total_amount: totalAmount,
                payment_method: 'transfer_mp',
                payment_status: 'pending',
                receipt_url: receiptImage,
                is_confirmed: true
            });

            // Cancelar la reserva temporal ya que se convirtió en orden definitiva
            if (activeReservationId) {
                await api.shop.cancelReservation(selectedInstId, activeReservationId);
                setActiveReservationId(null);
            }

            setOrderConfirmed(newOrder);
            setCart({});
            setReceiptImage(null);
            setShowCheckoutModal(false);
            loadProducts();
            loadReservedStock();
            addToast("¡Pedido registrado con éxito! El buffet lo ha recibido.", "success");
        } catch (err: any) {
            addToast("Error al procesar pedido: " + err.message, "error");
        } finally {
            setSubmittingOrder(false);
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProduct.id) {
                await api.shop.updateProduct(editingProduct.id, {
                    ...editingProduct,
                    institution_id: selectedInstId
                });
                addToast("Producto actualizado", "success");
            } else {
                await api.shop.createProduct({
                    ...editingProduct,
                    institution_id: selectedInstId
                });
                addToast("Producto agregado a la tienda", "success");
            }
            setShowProductForm(false);
            loadProducts();
        } catch (e: any) {
            addToast("Error al guardar producto", "error");
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("¿Deseas eliminar este producto del catálogo?")) return;
        try {
            await api.shop.deleteProduct(id, selectedInstId);
            addToast("Producto eliminado", "info");
            loadProducts();
        } catch (e) {
            addToast("Error al eliminar producto", "error");
        }
    };

    const handleUpdateOrderStatus = async (order: StoreOrder, status: 'pending' | 'verified' | 'delivered' | 'cancelled') => {
        try {
            await api.shop.updateOrderStatus(order.id, status, selectedInstId, order);
            addToast(`Pedido marcado como ${status === 'delivered' ? 'Entregado (Ingreso asentado en Caja)' : status === 'verified' ? 'Pago Verificado (Ingreso asentado en Caja)' : status}`, "success");
            loadOrders();
        } catch (e) {
            addToast("Error al actualizar pedido", "error");
        }
    };

    // Manejador del Reabastecimiento de Stock
    const handleExecuteRestock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restockingProduct) return;

        setSubmittingRestock(true);
        try {
            const calculatedTotal = restockMode === 'total' 
                ? restockTotalCost 
                : (restockUnitCost * restockUnits);
            
            const calculatedUnit = restockMode === 'unit'
                ? restockUnitCost
                : (restockUnits > 0 ? restockTotalCost / restockUnits : 0);

            await api.shop.restockProduct({
                productId: restockingProduct.id,
                institutionId: selectedInstId,
                addedUnits: restockUnits,
                unitCost: calculatedUnit,
                totalCost: calculatedTotal,
                recordExpenseInCash: recordExpenseInCash,
                productName: restockingProduct.name
            });

            addToast(`Stock actualizado (+${restockUnits} un.) ${recordExpenseInCash && calculatedTotal > 0 ? 'y egreso registrado en caja' : ''}`, "success");
            setShowRestockModal(false);
            setRestockingProduct(null);
            loadProducts();
        } catch (err: any) {
            addToast("Error al reabastecer stock: " + err.message, "error");
        } finally {
            setSubmittingRestock(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Top Header Banner */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-primary/20 border border-emerald-500/20 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="space-y-2 z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                        <ShoppingBag size={14} /> Pro-Shop & Cantina Oficial
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Tienda del Club & Buffet
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                        Pedí tubos de pelotas oficiales para tu partido, grips, alquileres de raquetas, bebidas isotónicas y comida rápida de la cantina con retiro en mostrador o entrega en cancha.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 z-10">
                    {/* Club Selector */}
                    <div className="flex items-center gap-2 bg-sidebar border border-white/10 rounded-2xl px-3 py-2 text-xs">
                        <Building size={16} className="text-primary shrink-0" />
                        {isSuperAdmin ? (
                            <select 
                                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                                value={selectedInstId}
                                onChange={e => setSelectedInstId(e.target.value)}
                            >
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id} className="bg-slate-900 text-white">
                                        {inst.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="font-bold text-white tracking-wide">
                                {activeInstitution?.name || 'Club Asignado'}
                            </span>
                        )}
                    </div>

                    {/* Admin Dashboard & Court QR Buttons */}
                    {isClubAdmin && (
                        <>
                            <button
                                onClick={() => {
                                    setShowAdminModal(true);
                                    loadOrders();
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl border border-white/10 transition-all shadow-md flex items-center gap-2"
                            >
                                <Package size={16} className="text-primary" /> Gestión de Tienda
                            </button>
                            <button
                                onClick={() => setShowCourtQRModal(true)}
                                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold rounded-2xl border border-emerald-500/30 transition-all shadow-md flex items-center gap-2"
                                title="Generar carteles QR para imprimir en A4 y colocar en las canchas"
                            >
                                <QrCode size={16} /> Carteles QR Canchas
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Punto 3: Banner de Pedido Directo a Cancha si se escanea el QR */}
            {detectedCourt && (
                <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-2 border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                            <MapPin size={16} /> CANCHA {detectedCourt}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                ¡Pedí al Buffet sin salir de la Cancha {detectedCourt}! 🎾🥤
                            </h4>
                            <p className="text-xs text-emerald-300">
                                Tus bebidas, pelotas o comida se entregarán directamente en tu cancha en <strong className="text-white">{activeInstitution?.name}</strong>.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setDetectedCourt(null);
                            setCustomerNotes('');
                        }}
                        className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                        Cambiar cancha
                    </button>
                </div>
            )}

            {/* Mercado Pago 0% Fee Promo Card */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                        <CreditCard size={22} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>Pagos Express por Transferencia</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                0% Comisión
                            </span>
                        </h4>
                        <p className="text-xs text-slate-400">
                            Alias de {activeInstitution?.name || 'el club'}:{' '}
                            <strong className="font-mono text-emerald-400 text-sm">
                                {activeInstitution?.alias_mp || 'parqueespana.tenis'}
                            </strong>
                            {activeInstitution?.titular_mp && ` (${activeInstitution.titular_mp})`}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleCopyAlias}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 shrink-0"
                >
                    <Copy size={14} /> Copiar Alias
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-card/80 border border-white/10 p-1.5 rounded-2xl overflow-x-auto gap-2">
                {[
                    { id: 'all', label: 'Todos los Productos' },
                    { id: 'balls_acc', label: '🎾 Pelotas & Grips' },
                    { id: 'rentals', label: '🏸 Alquileres' },
                    { id: 'buffet', label: '🥪 Cantina & Bebidas' },
                    { id: 'apparel', label: '👕 Indumentaria' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveCategory(tab.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            activeCategory === tab.id
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-muted hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="text-center py-20 text-muted">Cargando catálogo del club...</div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl text-muted space-y-2">
                    <ShoppingBag className="mx-auto text-slate-600" size={40} />
                    <p className="font-bold text-white text-sm">No hay productos disponibles en esta categoría</p>
                    <p className="text-xs">Los organizadores pueden agregar productos desde el panel de administración.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredProducts.map(product => {
                        const inCart = cart[product.id];

                        return (
                            <Card 
                                key={product.id}
                                className="p-0 border-white/10 bg-card overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xl group"
                            >
                                {/* Image Box */}
                                <div className="h-44 bg-slate-900 relative overflow-hidden">
                                    {product.image_url ? (
                                        <img 
                                            src={product.image_url} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                            <ShoppingBag size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-black/60 backdrop-blur border border-white/10 text-white">
                                            {product.category === 'balls' ? 'Pelotas' : 
                                             product.category === 'accessories' ? 'Accesorio' :
                                             product.category === 'rentals' ? 'Alquiler' :
                                             product.category === 'buffet' ? 'Cantina' : 'Indumentaria'}
                                        </span>
                                    </div>
                                    {(() => {
                                        const available = getAvailableStock(product);
                                        if (available <= 0) {
                                            return (
                                                <div className="absolute top-3 right-3">
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600/90 text-white shadow">
                                                        Agotado
                                                    </span>
                                                </div>
                                            );
                                        }
                                        if (available <= 5) {
                                            return (
                                                <div className="absolute top-3 right-3">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/90 text-black shadow">
                                                        Últimas {available} un.
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="absolute top-3 right-3">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-emerald-400 border border-emerald-500/20 backdrop-blur">
                                                    {available} disp.
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-1.5">
                                        <h3 className="font-bold text-white text-base leading-snug group-hover:text-primary transition-colors">
                                            {product.name}
                                        </h3>
                                        {product.description && (
                                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                                {product.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-muted uppercase font-bold block">Precio</span>
                                            <span className="text-xl font-black text-emerald-400 font-mono">
                                                {formatCurrency(product.price)}
                                            </span>
                                        </div>

                                        {inCart ? (
                                            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-1">
                                                <button 
                                                    onClick={() => updateQuantity(product.id, -1)}
                                                    className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 flex items-center justify-center transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="font-mono font-bold text-white text-sm px-1">
                                                    {inCart.quantity}
                                                </span>
                                                <button 
                                                    onClick={() => updateQuantity(product.id, 1)}
                                                    disabled={inCart.quantity >= getAvailableStock(product)}
                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-colors ${
                                                        inCart.quantity >= getAvailableStock(product) 
                                                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                                                            : 'bg-emerald-500 text-black hover:bg-emerald-400'
                                                    }`}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                disabled={getAvailableStock(product) <= 0}
                                                onClick={() => addToCart(product)}
                                                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                                                    getAvailableStock(product) <= 0
                                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                                        : 'bg-primary hover:bg-primary-hover text-white shadow-primary/20'
                                                }`}
                                            >
                                                <ShoppingBag size={14} /> {getAvailableStock(product) <= 0 ? 'Sin Stock' : 'Agregar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Sticky Floating Cart Bar */}
            {totalCartItems > 0 && (
                <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-8 z-40 animate-in slide-in-from-bottom-5">
                    <button
                        onClick={() => setShowCartDrawer(true)}
                        className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-2xl shadow-emerald-600/50 flex items-center justify-between sm:justify-start gap-4 transition-all"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center font-mono">
                                {totalCartItems}
                            </div>
                            <span>Ver mi pedido</span>
                        </div>
                        <div className="flex items-center gap-2 border-l border-white/20 pl-4 font-mono text-base">
                            <span>{formatCurrency(totalAmount)}</span>
                            <ChevronRight size={18} />
                        </div>
                    </button>
                </div>
            )}

            {/* Cart Drawer Modal */}
            {showCartDrawer && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-card border-l border-white/10 h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="text-primary" size={20} />
                                    <h3 className="font-bold text-white text-lg">Tu Pedido</h3>
                                </div>
                                <button onClick={() => setShowCartDrawer(false)} className="text-muted hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Items List */}
                            <div className="space-y-3">
                                {cartItems.map(({ product, quantity }) => (
                                    <div key={product.id} className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-slate-800 text-muted flex items-center justify-center shrink-0">
                                                    <ShoppingBag size={20} />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-white text-xs truncate">{product.name}</h4>
                                                <p className="font-mono text-emerald-400 font-bold text-xs">
                                                    {formatCurrency(product.price)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button 
                                                onClick={() => updateQuantity(product.id, -1)}
                                                className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="font-mono font-bold text-white text-xs px-1">
                                                {quantity}
                                            </span>
                                            <button 
                                                onClick={() => updateQuantity(product.id, 1)}
                                                className="w-6 h-6 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-bold hover:bg-emerald-400"
                                            >
                                                <Plus size={12} />
                                            </button>
                                            <button 
                                                onClick={() => removeFromCart(product.id)}
                                                className="text-muted hover:text-red-400 ml-1 p-1"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pick-up note */}
                            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                    <Building size={14} className="text-primary" /> Retiro en el Club
                                </span>
                                <p className="text-[11px] text-muted">
                                    Mostrá tu número de orden en la cantina o solicitalo al canchero en tu cancha.
                                </p>
                            </div>
                        </div>

                        {/* Footer Total and Checkout CTA */}
                        <div className="pt-6 border-t border-white/10 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted font-bold">Total a pagar:</span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                    {formatCurrency(totalAmount)}
                                </span>
                            </div>

                            <button
                                onClick={handleStartCheckout}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
                            >
                                <CreditCard size={18} /> Continuar al Pago Express
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Express Modal (0% Comisión Mercado Pago) */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2">
                                <CreditCard size={20} className="text-emerald-400" />
                                <h3 className="font-bold text-white text-base">Checkout Express • 0% Comisión</h3>
                            </div>
                            <button 
                                onClick={() => {
                                    if (activeReservationId) {
                                        api.shop.cancelReservation(selectedInstId, activeReservationId);
                                        setActiveReservationId(null);
                                        loadReservedStock();
                                    }
                                    setShowCheckoutModal(false);
                                }} 
                                className="text-muted hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleConfirmOrder} className="p-6 overflow-y-auto space-y-5">
                            {/* Timer de Reserva Temporal (15 min) */}
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-amber-300 text-xs">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="shrink-0 animate-pulse text-amber-400" />
                                    <span>Stock reservado para vos durante:</span>
                                </div>
                                <span className="font-mono font-black text-sm bg-black/40 px-2.5 py-1 rounded-xl border border-amber-500/20 text-white">
                                    {Math.floor(reservationSecondsLeft / 60)}:{(reservationSecondsLeft % 60).toString().padStart(2, '0')} min
                                </span>
                            </div>

                            {/* Amount Highlight */}
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-1">
                                <span className="text-xs text-muted uppercase tracking-wider font-bold">Monto Exacto a Transferir</span>
                                <p className="text-3xl font-black text-emerald-400 font-mono">
                                    {formatCurrency(totalAmount)}
                                </p>
                            </div>

                            {/* Step 1: Copy Alias & Open Mercado Pago */}
                            <div className="space-y-3">
                                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                    Paso 1: Transferir con Mercado Pago o Banco
                                </span>

                                <div className="p-4 bg-sidebar border border-white/10 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-muted uppercase font-bold block">Alias Oficial del Club</span>
                                            <span className="font-mono font-black text-emerald-400 text-lg">
                                                {activeInstitution?.alias_mp || 'parqueespana.tenis'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCopyAlias}
                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            <Copy size={14} /> Copiar
                                        </button>
                                    </div>

                                    {activeInstitution?.titular_mp && (
                                        <p className="text-xs text-slate-300">
                                            Titular: <strong className="text-white">{activeInstitution.titular_mp}</strong>
                                        </p>
                                    )}

                                    {activeInstitution?.cvu_mp && (
                                        <p className="text-xs text-slate-400 font-mono">
                                            CVU: {activeInstitution.cvu_mp}
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleOpenMercadoPago}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink size={16} /> Copiar Alias y Abrir Mercado Pago
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: Contact & Notes */}
                            <div className="space-y-3 border-t border-white/10 pt-4">
                                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                    Paso 2: Datos de Entrega
                                </span>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-muted uppercase font-bold block mb-1">Nombre y Apellido *</label>
                                        <input
                                            type="text"
                                            required
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-primary font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-muted uppercase font-bold block mb-1">Teléfono / WhatsApp *</label>
                                        <input
                                            type="tel"
                                            required
                                            value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-primary font-mono"
                                            placeholder="ej: 3434567890"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-muted uppercase font-bold block mb-1">Notas de Entrega / Cancha</label>
                                        <input
                                            type="text"
                                            value={customerNotes}
                                            onChange={e => setCustomerNotes(e.target.value)}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-primary"
                                            placeholder="ej: Cancha 2, o retiro en buffet al terminar"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Adjuntar Comprobante OBLIGATORIO */}
                            <div className="space-y-3 border-t border-white/10 pt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                        Paso 3: Comprobante de Transferencia *
                                    </span>
                                    {receiptImage && (
                                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Adjunto
                                        </span>
                                    )}
                                </div>

                                <div className="p-4 bg-sidebar border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-2xl transition-colors text-center space-y-3 relative">
                                    {receiptImage ? (
                                        <div className="space-y-3">
                                            <div className="relative inline-block">
                                                <img 
                                                    src={receiptImage} 
                                                    alt="Comprobante adjunto" 
                                                    className="max-h-36 mx-auto rounded-xl object-contain border border-white/20 shadow-md"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setReceiptImage(null)}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow hover:bg-red-500"
                                                    title="Quitar comprobante"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-300">
                                                Comprobante listo. Haz clic en "Confirmar Pedido" para enviarlo al buffet.
                                            </p>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block space-y-2">
                                            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                                                <UploadCloud size={24} />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-white block">
                                                    Subir captura o foto del comprobante
                                                </span>
                                                <span className="text-[11px] text-muted block mt-0.5">
                                                    JPG, PNG o foto directa desde tu celular
                                                </span>
                                            </div>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                capture="environment" 
                                                onChange={handleReceiptFileChange}
                                                className="hidden" 
                                            />
                                        </label>
                                    )}
                                </div>

                                {!receiptImage && (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                                        <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                                        <span>El pedido no será enviado ni confirmado al buffet hasta adjuntar el comprobante.</span>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Button */}
                            <div className="border-t border-white/10 pt-4 space-y-2">
                                <button
                                    type="submit"
                                    disabled={submittingOrder || !receiptImage}
                                    className={`w-full py-3.5 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                                        !receiptImage || submittingOrder
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                            : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                                    }`}
                                >
                                    {submittingOrder ? 'Enviando comprobante...' : receiptImage ? '✅ Confirmar Pedido y Enviar al Buffet' : 'Adjuntá comprobante para confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Order Confirmed Success Modal */}
            {orderConfirmed && (() => {
                const generateReceiptText = () => {
                    const itemsText = (orderConfirmed.items || []).map(it => `• ${it.quantity}x ${it.product_name} (${formatCurrency(it.price * it.quantity)})`).join('\n');
                    const notesLine = orderConfirmed.customer_notes ? `\n📍 *Entrega / Cancha:* ${orderConfirmed.customer_notes}` : '';
                    return `🎾 *Comprobante de Pedido al Buffet - Smash Tenis*\n` +
                        `📋 *Orden:* #${orderConfirmed.id.slice(-6).toUpperCase()}\n` +
                        `🏢 *Club:* ${orderConfirmed.institution_name}\n` +
                        `👤 *Cliente:* ${orderConfirmed.customer_name} (${orderConfirmed.customer_phone})` +
                        notesLine + `\n\n` +
                        `🛒 *Detalle del Pedido:*\n${itemsText}\n\n` +
                        `💰 *Total Abonado:* ${formatCurrency(orderConfirmed.total_amount)}\n` +
                        `⚡ *Pago:* Transferencia Mercado Pago / CVU\n\n` +
                        `Adjunto el comprobante de transferencia bancaria. ¡Muchas gracias!`;
                };

                let clubWaPhone = (activeInstitution?.phone || '').replace(/[^0-9]/g, '');
                if (clubWaPhone.startsWith('0')) clubWaPhone = clubWaPhone.substring(1);
                if (clubWaPhone.length === 10) clubWaPhone = '549' + clubWaPhone;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                        <div className="bg-card border border-emerald-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl text-center space-y-5">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                                <CheckCircle2 size={36} />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white">¡Pedido Registrado con Éxito!</h3>
                                <p className="text-xs text-slate-300">
                                    Orden <strong className="font-mono text-emerald-400">#{orderConfirmed.id.slice(-6).toUpperCase()}</strong>
                                </p>
                            </div>

                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted">Total abonado:</span>
                                    <span className="font-mono font-bold text-white">{formatCurrency(orderConfirmed.total_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">Sede / Club:</span>
                                    <span className="font-bold text-white">{orderConfirmed.institution_name}</span>
                                </div>
                                {orderConfirmed.customer_notes && (
                                    <div className="flex justify-between pt-1 border-t border-white/5 text-emerald-400 font-bold">
                                        <span>Entrega:</span>
                                        <span>{orderConfirmed.customer_notes}</span>
                                    </div>
                                )}

                                {/* Punto 2: Desglose detallado de ítems */}
                                <div className="space-y-1 pt-2 border-t border-white/5">
                                    <span className="text-[10px] text-muted uppercase font-bold block">Productos:</span>
                                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                                        {orderConfirmed.items?.map((it, idx) => (
                                            <div key={idx} className="flex justify-between text-slate-300 text-[11px]">
                                                <span>• {it.quantity}x {it.product_name}</span>
                                                <span className="font-mono text-white">{formatCurrency(it.price * it.quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* WhatsApp Receipt Buttons (Punto 2) */}
                            <div className="space-y-2">
                                {clubWaPhone ? (
                                    <button
                                        onClick={() => {
                                            const msg = generateReceiptText();
                                            window.open(`https://wa.me/${clubWaPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 uppercase tracking-wider"
                                    >
                                        <MessageCircle size={16} /> Enviar Comprobante al Buffet por WhatsApp
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const msg = generateReceiptText();
                                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 uppercase tracking-wider"
                                    >
                                        <MessageCircle size={16} /> Compartir Comprobante por WhatsApp
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        const msg = generateReceiptText();
                                        navigator.clipboard.writeText(msg);
                                        addToast("¡Detalle del pedido copiado al portapapeles!", "success");
                                    }}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Copy size={13} /> Copiar Resumen del Pedido
                                </button>
                            </div>

                            <button
                                onClick={() => setOrderConfirmed(null)}
                                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Admin Management Modal */}
            {showAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-3">
                                <Package className="text-primary" size={22} />
                                <h3 className="font-bold text-white text-lg">Administración de Tienda & Cantina</h3>
                            </div>
                            <button onClick={() => setShowAdminModal(false)} className="text-muted hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Admin Subtabs */}
                        <div className="flex border-b border-white/10 px-5 bg-white/5 gap-4">
                            <button 
                                onClick={() => setAdminTab('orders')}
                                className={`py-3 text-xs font-bold border-b-2 transition-colors ${adminTab === 'orders' ? 'border-primary text-white' : 'border-transparent text-muted'}`}
                            >
                                📋 Pedidos Recibidos ({adminOrders.length})
                            </button>
                            <button 
                                onClick={() => setAdminTab('products')}
                                className={`py-3 text-xs font-bold border-b-2 transition-colors ${adminTab === 'products' ? 'border-primary text-white' : 'border-transparent text-muted'}`}
                            >
                                🎾 Catálogo de Productos ({products.length})
                            </button>
                        </div>

                        {/* Admin Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {adminTab === 'orders' ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-muted uppercase">Órdenes de compra recientes</h4>
                                        <button onClick={loadOrders} className="text-xs text-primary hover:underline font-bold">
                                            Actualizar lista
                                        </button>
                                    </div>

                                    {loadingOrders ? (
                                        <div className="text-center py-10 text-muted">Cargando pedidos...</div>
                                    ) : adminOrders.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-muted text-xs">
                                            No hay pedidos registrados todavía en este club.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {adminOrders.map(order => (
                                                <div key={order.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <span className="font-mono text-emerald-400 font-bold text-xs">
                                                                #{order.id.slice(-6).toUpperCase()}
                                                            </span>
                                                            <h5 className="font-bold text-white text-sm">{order.customer_name}</h5>
                                                            <p className="text-xs text-muted flex items-center gap-2">
                                                                <span>{new Date(order.created_at).toLocaleString()}</span>
                                                                {order.customer_phone && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>Tel: {order.customer_phone}</span>
                                                                    </>
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <span className="text-base font-black text-white font-mono">
                                                                {formatCurrency(order.total_amount)}
                                                            </span>
                                                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                                                                order.payment_status === 'delivered' 
                                                                    ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                                                                    : order.payment_status === 'verified'
                                                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                            }`}>
                                                                {order.payment_status === 'delivered' ? 'Entregado' : order.payment_status === 'verified' ? 'Pagado' : 'Pendiente'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Items breakdown */}
                                                    <div className="bg-black/20 p-2.5 rounded-xl space-y-1 text-xs">
                                                        {order.items.map((it, idx) => (
                                                            <div key={idx} className="flex justify-between text-slate-300">
                                                                <span>{it.quantity}x {it.product_name}</span>
                                                                <span className="font-mono">{formatCurrency(it.price * it.quantity)}</span>
                                                            </div>
                                                        ))}
                                                        {order.customer_notes && (
                                                            <p className="text-[11px] text-amber-300/90 font-medium italic pt-1 border-t border-white/5 flex items-center gap-1.5">
                                                                <MapPin size={12} className="text-amber-400" />
                                                                <span>Entrega: "{order.customer_notes}"</span>
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Comprobante de Pago Adjunto */}
                                                    {order.receipt_url && (
                                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
                                                            <div className="flex items-center gap-2 text-emerald-400">
                                                                <CheckCircle2 size={16} />
                                                                <span className="font-bold">Comprobante de Transferencia Adjunto</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewReceiptUrl(order.receipt_url || null)}
                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                                                            >
                                                                <Eye size={13} /> Ver Comprobante
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Action buttons */}
                                                    <div className="flex items-center justify-end gap-2 pt-1">
                                                        {order.payment_status !== 'delivered' && (
                                                            <button
                                                                onClick={() => handleUpdateOrderStatus(order, 'delivered')}
                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                Marcar como Entregado
                                                            </button>
                                                        )}
                                                        {order.payment_status === 'pending' && (
                                                            <button
                                                                onClick={() => handleUpdateOrderStatus(order, 'verified')}
                                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                Verificar Pago
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-muted uppercase">Catálogo de productos del club</h4>
                                        <button
                                            onClick={() => {
                                                setEditingProduct({
                                                    institution_id: selectedInstId,
                                                    category: 'balls',
                                                    price: 10000,
                                                    is_available: true,
                                                    stock: 50
                                                });
                                                setShowProductForm(true);
                                            }}
                                            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                                        >
                                            <Plus size={14} /> Nuevo Producto
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {products.map(p => (
                                            <div key={p.id} className="p-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-xl object-cover" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-xl bg-slate-800 text-muted flex items-center justify-center">
                                                            <ShoppingBag size={20} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h5 className="font-bold text-white text-xs">{p.name}</h5>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="font-mono text-emerald-400 text-xs font-bold">{formatCurrency(p.price)}</span>
                                                            <span className="text-[11px] text-muted">•</span>
                                                            <span className={`text-[11px] font-bold ${
                                                                (p.stock || 0) <= 0 ? 'text-red-400' : (p.stock || 0) <= 5 ? 'text-amber-400' : 'text-slate-300'
                                                            }`}>
                                                                Stock: {p.stock ?? 0} un.
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                                    <button
                                                        onClick={() => {
                                                            setRestockingProduct(p);
                                                            setRestockUnits(10);
                                                            setRestockMode('unit');
                                                            setRestockUnitCost(p.cost_price || Math.round(p.price * 0.6));
                                                            setRestockTotalCost((p.cost_price || Math.round(p.price * 0.6)) * 10);
                                                            setRecordExpenseInCash(true);
                                                            setShowRestockModal(true);
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors flex items-center gap-1"
                                                        title="Cargar stock y registrar egreso en caja"
                                                    >
                                                        <Plus size={12} /> Cargar Stock
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingProduct(p);
                                                            setShowProductForm(true);
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(p.id)}
                                                        className="p-1.5 text-muted hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Product Edit/Create Modal */}
            {showProductForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h4 className="font-bold text-white text-base">
                                {editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}
                            </h4>
                            <button onClick={() => setShowProductForm(false)} className="text-muted hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
                            <div>
                                <label className="text-muted uppercase font-bold block mb-1">Nombre</label>
                                <input
                                    required
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white"
                                    value={editingProduct.name || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-muted uppercase font-bold block mb-1">Categoría</label>
                                    <select
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white"
                                        value={editingProduct.category || 'balls'}
                                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as ProductCategory })}
                                    >
                                        <option value="balls">Pelotas</option>
                                        <option value="accessories">Accesorios/Grips</option>
                                        <option value="rentals">Alquileres</option>
                                        <option value="buffet">Cantina/Buffet</option>
                                        <option value="apparel">Indumentaria</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-muted uppercase font-bold block mb-1">Precio (ARS)</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white font-mono font-bold"
                                        value={editingProduct.price || ''}
                                        onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-muted uppercase font-bold block mb-1">Descripción</label>
                                <textarea
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white resize-none h-16"
                                    value={editingProduct.description || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-muted uppercase font-bold block mb-1">Imagen URL (Opcional)</label>
                                <input
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white"
                                    value={editingProduct.image_url || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowProductForm(false)}
                                    className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold"
                                >
                                    Guardar Producto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Reabastecimiento de Stock (Carga de Stock + Egreso en Caja) */}
            {showRestockModal && restockingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Package className="text-primary" size={20} />
                                <h4 className="font-bold text-white text-base">
                                    Cargar Stock • {restockingProduct.name}
                                </h4>
                            </div>
                            <button onClick={() => setShowRestockModal(false)} className="text-muted hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleExecuteRestock} className="space-y-4 text-xs">
                            {/* Stock actual */}
                            <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center text-slate-300">
                                <span>Stock actual disponible:</span>
                                <span className="font-mono font-bold text-white text-sm">
                                    {restockingProduct.stock ?? 0} unidades
                                </span>
                            </div>

                            {/* Unidades a sumar */}
                            <div>
                                <label className="text-muted uppercase font-bold block mb-1">
                                    Cantidad de unidades a ingresar *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white font-mono font-bold text-base focus:outline-none focus:border-primary"
                                    value={restockUnits || ''}
                                    onChange={e => {
                                        const units = Number(e.target.value) || 0;
                                        setRestockUnits(units);
                                        if (restockMode === 'unit') {
                                            setRestockTotalCost(units * restockUnitCost);
                                        }
                                    }}
                                />
                            </div>

                            {/* Selector de modo de costo */}
                            <div className="space-y-2">
                                <label className="text-muted uppercase font-bold block">
                                    Costo de adquisición del producto
                                </label>
                                <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRestockMode('unit');
                                            setRestockTotalCost(restockUnits * restockUnitCost);
                                        }}
                                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            restockMode === 'unit' ? 'bg-primary text-white shadow' : 'text-muted hover:text-white'
                                        }`}
                                    >
                                        Por Unidad
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRestockMode('total');
                                            if (restockTotalCost === 0) setRestockTotalCost(restockUnits * restockUnitCost);
                                        }}
                                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            restockMode === 'total' ? 'bg-primary text-white shadow' : 'text-muted hover:text-white'
                                        }`}
                                    >
                                        Lote Total
                                    </button>
                                </div>

                                {restockMode === 'unit' ? (
                                    <div>
                                        <label className="text-muted text-[11px] block mb-1">Costo de compra por unidad ($)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white font-mono text-sm"
                                            value={restockUnitCost || ''}
                                            onChange={e => {
                                                const unit = Number(e.target.value) || 0;
                                                setRestockUnitCost(unit);
                                                setRestockTotalCost(unit * restockUnits);
                                            }}
                                            placeholder="ej: 800"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Costo total estimado: <strong className="text-emerald-400 font-mono">{formatCurrency(restockUnits * restockUnitCost)}</strong>
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-muted text-[11px] block mb-1">Costo total pagado por el lote ($)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white font-mono text-sm"
                                            value={restockTotalCost || ''}
                                            onChange={e => {
                                                const tot = Number(e.target.value) || 0;
                                                setRestockTotalCost(tot);
                                                if (restockUnits > 0) setRestockUnitCost(tot / restockUnits);
                                            }}
                                            placeholder="ej: 19200"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Costo unitario resultante: <strong className="text-emerald-400 font-mono">{formatCurrency(restockUnits > 0 ? restockTotalCost / restockUnits : 0)} c/u</strong>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Checkbox de Imputación a Caja */}
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="recordExpenseInCash"
                                    checked={recordExpenseInCash}
                                    onChange={e => setRecordExpenseInCash(e.target.checked)}
                                    className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                                />
                                <label htmlFor="recordExpenseInCash" className="text-slate-200 cursor-pointer text-xs">
                                    <strong className="text-white block">Registrar como Egreso en la Caja del Club</strong>
                                    Se asentará automáticamente un movimiento de egreso en Finanzas por {formatCurrency(restockMode === 'total' ? restockTotalCost : (restockUnits * restockUnitCost))}.
                                </label>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRestockModal(false)}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRestock || restockUnits <= 0}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                                >
                                    {submittingRestock ? 'Guardando...' : 'Confirmar Ingreso de Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pop-up Alerta Sonora en Vivo para el Organizador */}
            {liveIncomingOrder && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 max-w-sm w-full">
                    <div className="p-4 bg-slate-900/95 border-2 border-emerald-500 rounded-3xl shadow-2xl backdrop-blur-md space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                ¡Nuevo Pedido en Buffet! 🎾🥤
                            </div>
                            <button
                                onClick={() => setLiveIncomingOrder(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-1 text-xs">
                            <p className="font-bold text-white text-sm">{liveIncomingOrder.customer_name}</p>
                            {liveIncomingOrder.customer_notes && (
                                <p className="text-amber-300 font-bold flex items-center gap-1">
                                    <MapPin size={12} /> {liveIncomingOrder.customer_notes}
                                </p>
                            )}
                            <div className="flex justify-between items-center pt-1 text-slate-300 font-mono">
                                <span>Total: {formatCurrency(liveIncomingOrder.total_amount)}</span>
                                <span className="text-[10px] text-emerald-400 font-sans font-bold">Comprobante adjunto</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => {
                                    setLiveIncomingOrder(null);
                                    setShowAdminModal(true);
                                    setAdminTab('orders');
                                    loadOrders();
                                }}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
                            >
                                <Eye size={14} /> Ver en Gestión de Tienda
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Zoom / Previsualización de Comprobante */}
            {previewReceiptUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-card border border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <CreditCard className="text-emerald-400" size={20} />
                                <h4 className="font-bold text-white text-base">Comprobante de Pago Adjunto</h4>
                            </div>
                            <button onClick={() => setPreviewReceiptUrl(null)} className="text-muted hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-black/40 rounded-2xl p-2 border border-white/5">
                            <img 
                                src={previewReceiptUrl} 
                                alt="Comprobante de Transferencia" 
                                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                onClick={() => {
                                    const w = window.open('');
                                    w?.document.write(`<img src="${previewReceiptUrl}" style="max-width:100%"/>`);
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                            >
                                <ExternalLink size={14} /> Abrir en pestaña nueva
                            </button>
                            <button
                                onClick={() => setPreviewReceiptUrl(null)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Punto 3: Modal de Carteles QR para Canchas */}
            {activeInstitution && (
                <CourtQRModal
                    institution={activeInstitution}
                    isOpen={showCourtQRModal}
                    onClose={() => setShowCourtQRModal(false)}
                />
            )}
        </div>
    );
};
