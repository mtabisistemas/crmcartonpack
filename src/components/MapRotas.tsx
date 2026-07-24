'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Phone, Play, Square, CheckCircle2, Clock, Route, Maximize2, Minimize2 } from 'lucide-react';
import { toastService } from '../services/toast-service';

interface MapRotasProps {
  isDarkTheme: boolean;
}

declare let L: any;

export const MapRotas: React.FC<MapRotasProps> = ({ isDarkTheme }) => {
  const [repAtivoId, setRepAtivoId] = useState('usr-rep-carlos');
  const [playSimulacao, setPlaySimulacao] = useState(false);
  const [simulatedLoc, setSimulatedLoc] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(t);
  }, [isExpanded]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const rotasRepresentantes: Record<string, {
    nome: string;
    cor: string;
    cidadeBase: string;
    deslocamentoKms: number;
    posicaoAtual: { lat: number; lng: number; local: string };
    pontosRota: { local: string; cidade: string; latLng: [number, number]; horario: string; objetivo: string; status: 'concluida' | 'pendente' }[];
    contatosSuporte: { nome: string; cargo: string; telefone: string }[];
  }> = {
    'usr-rep-carlos': {
      nome: 'Fausto Fleck', cor: '#3B82F6', cidadeBase: 'Porto Alegre', deslocamentoKms: 145,
      posicaoAtual: { lat: -29.1688, lng: -51.1796, local: 'Sul Alimentos, Caxias' },
      pontosRota: [
        { local: 'Centro Administrativo Carton Pack', cidade: 'Porto Alegre', latLng: [-30.0346, -51.2177], horario: '08:00', objetivo: 'Retirada de amostras físicas', status: 'concluida' },
        { local: 'Calçados Elegance S.A.', cidade: 'Novo Hamburgo', latLng: [-29.6842, -51.1313], horario: '10:15', objetivo: 'Discussão de faca de corte gaveta', status: 'concluida' },
        { local: 'Sul Alimentos Ltda', cidade: 'Caxias do Sul', latLng: [-29.1688, -51.1796], horario: '14:30', objetivo: 'Negociação comercial de lote', status: 'concluida' },
        { local: 'Vinícola Vale do Sol', cidade: 'Bento Gonçalves', latLng: [-29.1706, -51.5204], horario: '16:45', objetivo: 'Relacionamento e pós-venda', status: 'pendente' }
      ],
      contatosSuporte: [
        { nome: 'Diéssica Hartmann', cargo: 'Vendedor Interno', telefone: '(51) 99344-1234' },
        { nome: 'Thaiane Antunes', cargo: 'Supervisora Comercial', telefone: '(51) 98111-5555' }
      ]
    },
    'usr-rep-juliana': {
      nome: 'Ana Paula Nunes', cor: '#A855F7', cidadeBase: 'Novo Hamburgo', deslocamentoKms: 98,
      posicaoAtual: { lat: -29.6483, lng: -51.1742, local: 'Curtume Luz, Estância Velha' },
      pontosRota: [
        { local: 'Centro Operacional', cidade: 'Novo Hamburgo', latLng: [-29.6842, -51.1313], horario: '08:30', objetivo: 'Alinhamento PCP', status: 'concluida' },
        { local: 'Calçados Piccadilly', cidade: 'Igrejinha', latLng: [-29.5742, -50.7967], horario: '10:00', objetivo: 'Desenvolvimento de Embalagem', status: 'concluida' },
        { local: 'Curtume Luz', cidade: 'Estância Velha', latLng: [-29.6483, -51.1742], horario: '13:45', objetivo: 'Qualidade / Reclamação Cola', status: 'concluida' },
        { local: 'Componentes Couro Sul', cidade: 'São Leopoldo', latLng: [-29.7592, -51.1472], horario: '16:00', objetivo: 'Apresentação Institucional', status: 'pendente' }
      ],
      contatosSuporte: [{ nome: 'Diéssica Hartmann', cargo: 'Vendedor Interno', telefone: '(51) 99344-1234' }]
    },
    'usr-rep-marcos': {
      nome: 'Felipe Ribeiro', cor: '#EAB308', cidadeBase: 'Caxias do Sul', deslocamentoKms: 210,
      posicaoAtual: { lat: -29.2246, lng: -51.3482, local: 'Laticínios Serra, Farroupilha' },
      pontosRota: [
        { local: 'Filial Carton Pack', cidade: 'Caxias do Sul', latLng: [-29.1688, -51.1796], horario: '07:45', objetivo: 'Coleta de Amostras de Papelão', status: 'concluida' },
        { local: 'Frutas Nobres Exporte', cidade: 'Vacaria', latLng: [-28.5117, -50.9333], horario: '10:30', objetivo: 'Negociação Caixa Térmica', status: 'concluida' },
        { local: 'Laticínios Serra Azul', cidade: 'Farroupilha', latLng: [-29.2246, -51.3482], horario: '14:00', objetivo: 'Briefing técnico de cartucho triplex', status: 'concluida' },
        { local: 'Metalúrgica Metasul', cidade: 'Garibaldi', latLng: [-29.2559, -51.5342], horario: '16:30', objetivo: 'Acompanhamento pós-venda', status: 'pendente' }
      ],
      contatosSuporte: [{ nome: 'Thaiane Antunes', cargo: 'Supervisora Comercial', telefone: '(51) 98111-5555' }]
    },
    'usr-rep-fernanda': {
      nome: 'Witalo Frota', cor: '#F97316', cidadeBase: 'Porto Alegre', deslocamentoKms: 80,
      posicaoAtual: { lat: -30.1136, lng: -51.3253, local: 'Doces Estrela, Guaíba' },
      pontosRota: [
        { local: 'Centro Administrativo Carton Pack', cidade: 'Porto Alegre', latLng: [-30.0346, -51.2177], horario: '09:00', objetivo: 'Retirada de Protótipos', status: 'concluida' },
        { local: 'Doces Estrela e Embalagens', cidade: 'Guaíba', latLng: [-30.1136, -51.3253], horario: '11:15', objetivo: 'Discussão de design de Páscoa', status: 'concluida' },
        { local: 'Plásticos e Papéis Cartonados', cidade: 'Gravataí', latLng: [-29.9430, -50.9934], horario: '14:45', objetivo: 'Apresentação de portfólio', status: 'pendente' }
      ],
      contatosSuporte: [{ nome: 'Diéssica Hartmann', cargo: 'Vendedor Interno', telefone: '(51) 99344-1234' }]
    }
  };

  const repAtivo = rotasRepresentantes[repAtivoId];

  useEffect(() => {
    if ((window as any).L) { setLeafletLoaded(true); return; }
    const interval = setInterval(() => {
      if ((window as any).L) { setLeafletLoaded(true); clearInterval(interval); }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: true }).setView([-29.5, -51.2], 9);
    mapInstanceRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [leafletLoaded]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    tileLayerRef.current = L.tileLayer(tileUrl, { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
  }, [leafletLoaded, isDarkTheme]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || !repAtivo) return;
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    markersRef.current = {};
    const latLngs = repAtivo.pontosRota.map(p => p.latLng);
    polylineRef.current = L.polyline(latLngs, { color: repAtivo.cor, weight: 4.5, dashArray: '10, 8', opacity: 0.85 }).addTo(map);
    repAtivo.pontosRota.forEach((p, idx) => {
      const visitColor = p.status === 'concluida' ? '#B4D932' : '#71717A';
      const customIcon = L.divIcon({
        className: 'custom-visit-marker-icon',
        html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%)"><div style="background-color:${visitColor};width:12px;height:12px;border-radius:50%;border:2.5px solid #000;box-shadow:0 0 10px ${visitColor}"></div><div style="position:absolute;top:-18px;background-color:rgba(9,9,11,0.95);color:#fff;font-size:8px;font-weight:bold;padding:1px 5px;border-radius:4px;border:1px solid ${visitColor};white-space:nowrap">${p.horario}</div></div>`,
        iconSize: [0, 0], iconAnchor: [0, 0]
      });
      const marker = L.marker(p.latLng, { icon: customIcon })
        .bindPopup(`<div style="padding:3px;font-family:'Inter',sans-serif"><strong style="color:${repAtivo.cor};font-size:11px">${p.local}</strong><br/><span style="font-size:10px;color:#E4E4E7;line-height:1.5"><b>Horário:</b> ${p.horario}<br/><b>Objetivo:</b> ${p.objetivo}</span></div>`)
        .addTo(map);
      markersRef.current[`point-${idx}`] = marker;
    });
    const gpsIcon = L.divIcon({
      className: 'custom-gps-pulse',
      html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%)"><div style="background-color:${repAtivo.cor};width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 20px ${repAtivo.cor}"></div><div style="background-color:rgba(9,9,11,0.95);color:${repAtivo.cor};font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;border:1px solid ${repAtivo.cor};white-space:nowrap;margin-top:6px">📍 GPS: ${repAtivo.nome.split(' ')[0]}</div></div>`,
      iconSize: [0, 0], iconAnchor: [0, 0]
    });
    const gpsMarker = L.marker([repAtivo.posicaoAtual.lat, repAtivo.posicaoAtual.lng], { icon: gpsIcon })
      .bindPopup(`<div style="padding:3px;font-family:'Inter',sans-serif"><strong style="color:${repAtivo.cor};font-size:11px">GPS: ${repAtivo.nome}</strong><br/><span style="font-size:10px;color:#E4E4E7"><b>Local:</b> ${repAtivo.posicaoAtual.local}</span></div>`)
      .addTo(map);
    markersRef.current['gps'] = gpsMarker;
    const bounds = L.latLngBounds(latLngs);
    bounds.extend([repAtivo.posicaoAtual.lat, repAtivo.posicaoAtual.lng]);
    map.fitBounds(bounds.pad(0.18));
  }, [leafletLoaded, repAtivoId]);

  const handleSimularGPS = () => {
    if (playSimulacao || !repAtivo) return;
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;
    setPlaySimulacao(true);
    toastService.success(`Iniciando monitoramento de GPS de ${repAtivo.nome}...`);
    const path = repAtivo.pontosRota.map(p => p.latLng);
    let step = 0;
    const interval = setInterval(() => {
      if (step >= path.length) {
        clearInterval(interval);
        setPlaySimulacao(false);
        setSimulatedLoc(null);
        const gpsMarker = markersRef.current['gps'];
        if (gpsMarker && mapInstanceRef.current) {
          gpsMarker.setLatLng([repAtivo.posicaoAtual.lat, repAtivo.posicaoAtual.lng]);
          mapInstanceRef.current.panTo([repAtivo.posicaoAtual.lat, repAtivo.posicaoAtual.lng]);
          gpsMarker.closePopup();
        }
        toastService.success(`Rastreamento de ${repAtivo.nome.split(' ')[0]} concluído!`);
        return;
      }
      const currentPoint = repAtivo.pontosRota[step];
      setSimulatedLoc(currentPoint.local);
      toastService.info(`${repAtivo.nome.split(' ')[0]} chegou em: ${currentPoint.local}`);
      const gpsMarker = markersRef.current['gps'];
      if (gpsMarker && mapInstanceRef.current) {
        gpsMarker.setLatLng(currentPoint.latLng);
        mapInstanceRef.current.panTo(currentPoint.latLng);
        gpsMarker.openPopup();
      }
      step++;
    }, 1800);
  };

  const completedStops = repAtivo?.pontosRota.filter(p => p.status === 'concluida').length ?? 0;
  const totalStops = repAtivo?.pontosRota.length ?? 0;

  return (
    <div className="page-content animate-fade-up pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--lime)]/10 border border-[var(--lime)]/20 flex items-center justify-center">
              <Navigation size={15} className="text-[var(--lime)]" />
            </div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-[var(--white)] tracking-tight">
              Geolocalização & Rotas
            </h1>
          </div>
        </div>

        {/* Progress strip */}
        <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--line)] rounded-2xl px-5 py-3">
          <Route size={14} className="text-[var(--lime)] shrink-0" />
          <div>
            <div className="text-[9px] font-mono uppercase text-[var(--gray)] tracking-wider">Progresso do dia</div>
            <div className="text-sm font-black text-[var(--white)] font-display mt-0.5">
              {completedStops} <span className="text-[var(--gray)] font-normal text-xs">/ {totalStops} paradas</span>
            </div>
          </div>
          <div className="w-24 h-1.5 bg-[var(--black)] rounded-full overflow-hidden border border-[var(--line)] ml-1">
            <div
              className="h-full bg-[var(--lime)] rounded-full"
              style={{ width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%`, boxShadow: '0 0 8px rgba(180,217,50,0.4)' }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── MAP COLUMN (8 cols) ── */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* Rep Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(rotasRepresentantes).map(([id, r]) => {
              const isActive = id === repAtivoId;
              return (
                <button
                  key={id}
                  onClick={() => { if (!playSimulacao) setRepAtivoId(id); }}
                  disabled={playSimulacao}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'border-[var(--line)] bg-[var(--card)] text-[var(--white)] shadow-sm'
                      : 'border-transparent text-[var(--gray)] hover:text-[var(--white)] hover:bg-[var(--card)]/50'
                  } ${playSimulacao ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: r.cor, boxShadow: isActive ? `0 0 6px ${r.cor}` : 'none' }}
                  />
                  {r.nome.split(' ')[0]}
                  {isActive && <span className="text-[9px] font-mono text-[var(--gray)] ml-1">{r.deslocamentoKms}km</span>}
                </button>
              );
            })}
          </div>

          {/* Map Container */}
          <div className={`relative rounded-2xl border border-[var(--line)] overflow-hidden bg-[var(--black)] transition-all ${isExpanded ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none p-4 bg-[var(--charcoal)]' : ''}`} style={isExpanded ? {} : { height: '480px' }}>
            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--card)] text-[var(--white)] hover:border-[var(--lime)] hover:text-[var(--lime)] text-xs font-mono font-bold shadow-lg cursor-pointer"
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isExpanded ? 'Minimizar' : 'Ampliar'}</span>
              </button>
            </div>
            {!leafletLoaded ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-xs text-[var(--gray)] font-mono">
                <div className="w-6 h-6 border-2 border-[var(--lime)] border-t-transparent rounded-full animate-spin" />
                <span>Carregando malha viária OpenStreetMap...</span>
              </div>
            ) : (
              <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 10 }} />
            )}
          </div>

          {/* GPS Status Bar */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 border border-[var(--lime)]/20 flex items-center justify-center shrink-0">
              <MapPin size={16} className={`text-[var(--lime)] ${playSimulacao ? 'animate-bounce' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-mono uppercase text-[var(--gray)] tracking-wider mb-0.5">GPS Comercial Ativo</div>
              <div className="text-sm font-semibold text-[var(--white)] truncate">
                <span className="text-[var(--gray)] font-normal">{repAtivo?.nome} — </span>
                <span className="text-[var(--lime)] font-bold">
                  {simulatedLoc || repAtivo?.posicaoAtual.local}
                </span>
              </div>
            </div>
            <button
              onClick={handleSimularGPS}
              disabled={playSimulacao}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                playSimulacao
                  ? 'bg-[var(--lime)] text-black border-[var(--lime)] animate-pulse shadow-[0_0_15px_rgba(180,217,50,0.3)]'
                  : 'bg-transparent text-[var(--lime)] border-[var(--lime)]/30 hover:bg-[var(--lime)]/10 hover:border-[var(--lime)]/60'
              }`}
            >
              {playSimulacao ? <Square size={12} /> : <Play size={12} />}
              {playSimulacao ? 'Rastreando...' : 'Simular GPS'}
            </button>
          </div>
        </div>

        {/* ── SIDE PANEL (4 cols) ── */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* Itinerary Card */}
          {repAtivo && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest flex items-center gap-1.5">
                  <Navigation size={11} className="text-[var(--lime)]" />
                  Roteiro do Dia
                </span>
                <span
                  className="text-[9px] font-mono font-black px-2.5 py-1 rounded-full border"
                  style={{
                    color: repAtivo.cor,
                    borderColor: `${repAtivo.cor}40`,
                    backgroundColor: `${repAtivo.cor}12`
                  }}
                >
                  {repAtivo.deslocamentoKms} km
                </span>
              </div>

              {/* Timeline */}
              <div className="p-5">
                <div className="relative pl-5 border-l border-[var(--line)] space-y-5">
                  {repAtivo.pontosRota.map((ponto, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--black)] flex items-center justify-center ${
                        ponto.status === 'concluida' ? 'bg-[var(--lime)]' : 'bg-[var(--charcoal)] border-[var(--line)]'
                      }`}>
                        {ponto.status === 'concluida' && (
                          <CheckCircle2 size={8} className="text-black" />
                        )}
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-semibold leading-snug ${ponto.status === 'concluida' ? 'text-[var(--white)]' : 'text-[var(--gray)]'}`}>
                            {ponto.local}
                          </span>
                          <span className="text-[9px] font-mono text-[var(--gray2)] shrink-0 flex items-center gap-1">
                            <Clock size={8} />
                            {ponto.horario}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--gray2)]">{ponto.cidade}</div>
                        <div className="text-[10px] text-[var(--lime)]/70 font-medium italic">{ponto.objetivo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Support Contacts Card */}
          {repAtivo && repAtivo.contatosSuporte.length > 0 && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] overflow-hidden">
              <div className="flex items-center gap-1.5 px-5 py-4 border-b border-[var(--line)]">
                <Phone size={11} className="text-[var(--lime)]" />
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest">
                  Apoio Interno Fábrica
                </span>
              </div>

              <div className="p-3 space-y-2">
                {repAtivo.contatosSuporte.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--charcoal)] border border-[var(--line)] hover:border-[var(--lime)]/20 transition-colors">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--white)] truncate">{c.nome}</div>
                      <div className="text-[9px] font-mono text-[var(--gray)] uppercase tracking-wide">{c.cargo}</div>
                    </div>
                    <button
                      onClick={() => toastService.success(`Ligando para ${c.nome} — ${c.telefone}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--black)] text-[10px] font-mono text-[var(--gray)] hover:border-[var(--lime)]/40 hover:text-[var(--lime)] transition-all cursor-pointer shrink-0"
                    >
                      <Phone size={10} />
                      Ligar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
