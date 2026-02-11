import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  useFlowCurrentUser,
  useFlowQuery,
  useFlowMutate,
  useFlowTransactionStatus,
} from '@onflow/react-sdk';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

// ────────────────────────────────────────────────────────────
//  Cadence Scripts & Transactions
// ────────────────────────────────────────────────────────────

const ADDRESSES = {
  StreamVest: '0x5ec90e3dcf0067c4',
  StreamVestSchedulerV2: '0x5ec90e3dcf0067c4',
  NonFungibleToken: '0x1d7e57aa55817448',
  MetadataViews: '0x1d7e57aa55817448',
  FungibleToken: '0xf233dcee88fe0abe',
  FlowToken: '0x1654653399040a61',
  FlowTransactionScheduler: '0xe467b9dd11fa00df',
};

const GET_ALL_STREAMS = `
import StreamVest from ${ADDRESSES.StreamVest}
import NonFungibleToken from ${ADDRESSES.NonFungibleToken}

access(all) struct StreamInfo {
  access(all) let id: UInt64
  access(all) let totalAmount: UFix64
  access(all) let totalStreamed: UFix64
  access(all) let status: String
  access(all) let isActive: Bool
  access(all) let destinationAddress: Address

  init(id: UInt64, totalAmount: UFix64, totalStreamed: UFix64, status: String, isActive: Bool, destinationAddress: Address) {
    self.id = id
    self.totalAmount = totalAmount
    self.totalStreamed = totalStreamed
    self.status = status
    self.isActive = isActive
    self.destinationAddress = destinationAddress
  }
}

access(all) fun main(owner: Address): [StreamInfo] {
  let account = getAccount(owner)
  let collection = account.capabilities.get<&StreamVest.Collection>(
    StreamVest.CollectionPublicPath
  ).borrow()
  if collection == nil { return [] }
  let ids = collection!.getIDs()
  var streams: [StreamInfo] = []
  for id in ids {
    let nft = collection!.borrowStreamVestNFT(id: id)
    if nft != nil {
      streams.append(StreamInfo(
        id: nft!.id,
        totalAmount: nft!.totalAmount,
        totalStreamed: nft!.totalStreamed,
        status: nft!.getStatus(),
        isActive: nft!.isActive,
        destinationAddress: nft!.destinationAddress
      ))
    }
  }
  return streams
}
`;

const GET_STREAM_STATUS = `
import StreamVest from ${ADDRESSES.StreamVest}
import NonFungibleToken from ${ADDRESSES.NonFungibleToken}

access(all) struct StreamStatus {
  access(all) let id: UInt64
  access(all) let totalAmount: UFix64
  access(all) let totalStreamed: UFix64
  access(all) let remaining: UFix64
  access(all) let claimable: UFix64
  access(all) let streamRate: UFix64
  access(all) let startTime: UFix64
  access(all) let endTime: UFix64
  access(all) let lastStreamTime: UFix64
  access(all) let destinationAddress: Address
  access(all) let status: String
  access(all) let progressPercent: UFix64
  access(all) let isActive: Bool

  init(id: UInt64, totalAmount: UFix64, totalStreamed: UFix64, remaining: UFix64, claimable: UFix64, streamRate: UFix64, startTime: UFix64, endTime: UFix64, lastStreamTime: UFix64, destinationAddress: Address, status: String, progressPercent: UFix64, isActive: Bool) {
    self.id = id
    self.totalAmount = totalAmount
    self.totalStreamed = totalStreamed
    self.remaining = remaining
    self.claimable = claimable
    self.streamRate = streamRate
    self.startTime = startTime
    self.endTime = endTime
    self.lastStreamTime = lastStreamTime
    self.destinationAddress = destinationAddress
    self.status = status
    self.progressPercent = progressPercent
    self.isActive = isActive
  }
}

access(all) fun main(owner: Address, nftID: UInt64): StreamStatus {
  let account = getAccount(owner)
  let collection = account.capabilities.get<&StreamVest.Collection>(
    StreamVest.CollectionPublicPath
  ).borrow() ?? panic("No collection")
  let nft = collection.borrowStreamVestNFT(id: nftID) ?? panic("NFT not found")
  return StreamStatus(
    id: nft.id,
    totalAmount: nft.totalAmount,
    totalStreamed: nft.totalStreamed,
    remaining: nft.getRemainingBalance(),
    claimable: nft.calculateClaimable(),
    streamRate: nft.streamRate,
    startTime: nft.startTime,
    endTime: nft.endTime,
    lastStreamTime: nft.lastStreamTime,
    destinationAddress: nft.destinationAddress,
    status: nft.getStatus(),
    progressPercent: nft.getProgressPercent(),
    isActive: nft.isActive
  )
}
`;

const GET_NFT_DISPLAY = `
import StreamVest from ${ADDRESSES.StreamVest}
import NonFungibleToken from ${ADDRESSES.NonFungibleToken}
import MetadataViews from ${ADDRESSES.MetadataViews}

access(all) struct NFTDisplay {
  access(all) let id: UInt64
  access(all) let displayName: String
  access(all) let description: String
  access(all) let thumbnailUrl: String
  access(all) let rawSVG: String

  init(id: UInt64, displayName: String, description: String, thumbnailUrl: String, rawSVG: String) {
    self.id = id
    self.displayName = displayName
    self.description = description
    self.thumbnailUrl = thumbnailUrl
    self.rawSVG = rawSVG
  }
}

access(all) fun main(owner: Address, nftID: UInt64): NFTDisplay {
  let account = getAccount(owner)
  let collection = account.capabilities.get<&StreamVest.Collection>(
    StreamVest.CollectionPublicPath
  ).borrow() ?? panic("No collection")
  let nft = collection.borrowStreamVestNFT(id: nftID) ?? panic("NFT not found")
  let display = nft.resolveView(Type<MetadataViews.Display>())! as! MetadataViews.Display
  return NFTDisplay(
    id: nft.id,
    displayName: display.name,
    description: display.description,
    thumbnailUrl: display.thumbnail.uri(),
    rawSVG: nft.generateSVG()
  )
}
`;

const MINT_AND_SCHEDULE = `
import StreamVest from ${ADDRESSES.StreamVest}
import StreamVestSchedulerV2 from ${ADDRESSES.StreamVestSchedulerV2}
import NonFungibleToken from ${ADDRESSES.NonFungibleToken}
import FungibleToken from ${ADDRESSES.FungibleToken}
import FlowToken from ${ADDRESSES.FlowToken}
import FlowTransactionScheduler from ${ADDRESSES.FlowTransactionScheduler}

transaction(
  amount: UFix64,
  destinationAddress: Address,
  durationSeconds: UFix64,
  intervalSeconds: UFix64,
  feeAmount: UFix64
) {
  prepare(signer: auth(Storage, Capabilities) &Account) {
    // 1. Ensure collection
    if signer.storage.borrow<&StreamVest.Collection>(from: StreamVest.CollectionStoragePath) == nil {
      let collection <- StreamVest.createEmptyCollection(nftType: Type<@StreamVest.NFT>())
      signer.storage.save(<-collection, to: StreamVest.CollectionStoragePath)
      let pubCap = signer.capabilities.storage.issue<&StreamVest.Collection>(StreamVest.CollectionStoragePath)
      signer.capabilities.publish(pubCap, at: StreamVest.CollectionPublicPath)
    }

    // 2. Withdraw FLOW
    let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
      from: /storage/flowTokenVault
    ) ?? panic("Could not borrow FlowToken vault")
    let streamVault <- flowVault.withdraw(amount: amount) as! @FlowToken.Vault
    let feeVault <- flowVault.withdraw(amount: feeAmount) as! @FlowToken.Vault

    // 3. Mint stream NFT
    let nft <- StreamVest.createStream(vault: <- streamVault, destination: destinationAddress, duration: durationSeconds)
    let nftID = nft.id

    // 4. Deposit NFT
    let collection = signer.storage.borrow<&StreamVest.Collection>(
      from: StreamVest.CollectionStoragePath
    ) ?? panic("Could not borrow collection")
    collection.deposit(token: <- nft)

    // 5. Create handler
    let handler <- StreamVestSchedulerV2.createHandler(
      collectionAddress: signer.address,
      nftID: nftID,
      intervalSeconds: intervalSeconds,
      priorityRaw: 2,
      effort: 500,
      feeVault: <- feeVault
    )

    // 6. Store handler
    let handlerPath = StoragePath(identifier: "StreamVestHandlerV2_".concat(nftID.toString()))!
    signer.storage.save(<- handler, to: handlerPath)

    // 7. Issue capability & set self-reference
    let handlerCap = signer.capabilities.storage.issue<
      auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}
    >(handlerPath)
    let handlerRef = signer.storage.borrow<&StreamVestSchedulerV2.ScheduledStreamHandler>(from: handlerPath)
      ?? panic("Could not borrow handler")
    handlerRef.setSelfCapability(cap: handlerCap)

    // 8. Schedule first execution
    let firstTime = getCurrentBlock().timestamp + intervalSeconds
    let priority = FlowTransactionScheduler.Priority(rawValue: 2)!
    let est = FlowTransactionScheduler.estimate(
      data: nil, timestamp: firstTime, priority: priority, executionEffort: 500
    )
    let firstFee <- flowVault.withdraw(amount: est.flowFee ?? 0.001) as! @FlowToken.Vault
    let receipt <- FlowTransactionScheduler.schedule(
      handlerCap: handlerCap, data: nil, timestamp: firstTime,
      priority: priority, executionEffort: 500, fees: <- firstFee
    )
    destroy receipt
  }
  execute {
    log("Stream minted and scheduled!")
  }
}
`;

// ────────────────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────────────────

const FEE_PER_TRIGGER = 0.04;

const DURATION_PRESETS = [
  { label: '1h', seconds: 3600 },
  { label: '1d', seconds: 86400 },
  { label: '1w', seconds: 604800 },
  { label: '1mo', seconds: 2592000 },
  { label: '3mo', seconds: 7776000 },
  { label: '1y', seconds: 31536000 },
];

const INTERVAL_PRESETS = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '1h', seconds: 3600 },
  { label: '6h', seconds: 21600 },
  { label: '1d', seconds: 86400 },
];

// ────────────────────────────────────────────────────────────
//  Utilities
// ────────────────────────────────────────────────────────────

function normalizeAddress(addr) {
  if (!addr) return addr;
  let hex = addr.startsWith('0x') ? addr.slice(2) : addr;
  hex = hex.padStart(16, '0');
  return '0x' + hex;
}

function formatFlow(amount, decimals = 4) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.0000';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatAddr(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatRate(rate) {
  const r = parseFloat(rate);
  if (isNaN(r) || r === 0) return '0 FLOW/s';
  if (r >= 1) return `${r.toFixed(4)} FLOW/s`;
  if (r * 60 >= 0.01) return `${(r * 60).toFixed(4)} FLOW/min`;
  if (r * 3600 >= 0.01) return `${(r * 3600).toFixed(4)} FLOW/hr`;
  return `${(r * 86400).toFixed(4)} FLOW/day`;
}

function formatDate(timestamp) {
  if (!timestamp || timestamp === '0.00000000') return '\u2014';
  const date = new Date(parseFloat(timestamp) * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toFixedCadence(val) {
  return parseFloat(val).toFixed(8);
}

// ────────────────────────────────────────────────────────────
//  Hooks
// ────────────────────────────────────────────────────────────

function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let frameId;
    function raf(time) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    lenis.on('scroll', ScrollTrigger.update);

    const tickerCallback = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      cancelAnimationFrame(frameId);
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
    };
  }, []);
}

// ────────────────────────────────────────────────────────────
//  Three.js Components
// ────────────────────────────────────────────────────────────

function StreamParticles({ count = 800 }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const x = -5 + t * 10;
      const y = (Math.random() - 0.5) * 3;
      const z = (Math.random() - 0.5) * 3;
      pos.push([x, y, z, Math.random()]);
    }
    return pos;
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    positions.forEach((p, i) => {
      const t = (p[0] + 5) / 10;
      const speed = 0.3;
      const newX = -5 + ((t + speed * 0.0005) % 1) * 10;
      const y = Math.sin(newX * 2) * 0.5 + p[1];
      const z = Math.cos(newX) * 0.5 + p[2];

      dummy.position.set(newX, y, z);
      dummy.scale.setScalar(0.05 + Math.sin(newX) * 0.02);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[new THREE.SphereGeometry(1, 8, 8), undefined, count]}>
      <meshStandardMaterial
        emissive="#00e1ff"
        emissiveIntensity={0.8}
        metalness={0.8}
        roughness={0.1}
      />
    </instancedMesh>
  );
}

function HeroVisualization() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#00e1ff" />
      <StreamParticles count={600} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} intensity={1.5} />
      </EffectComposer>
    </Canvas>
  );
}

// ────────────────────────────────────────────────────────────
//  UI Components
// ────────────────────────────────────────────────────────────

function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Skip on touch devices
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // GSAP quickTo for buttery smooth cursor tracking
    const xDot = gsap.quickTo(dot, "left", { duration: 0.1, ease: "power3.out" });
    const yDot = gsap.quickTo(dot, "top", { duration: 0.1, ease: "power3.out" });
    const xRing = gsap.quickTo(ring, "left", { duration: 0.3, ease: "power3.out" });
    const yRing = gsap.quickTo(ring, "top", { duration: 0.3, ease: "power3.out" });

    const onMove = (e) => {
      xDot(e.clientX - 4);
      yDot(e.clientY - 4);
      xRing(e.clientX - 20);
      yRing(e.clientY - 20);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    // Interactive element hover handlers
    const onLinkEnter = () => {
      gsap.to(ring, { scale: 1.8, borderColor: 'rgba(0, 225, 255, 0.6)', duration: 0.3 });
      gsap.to(dot, { scale: 0.5, opacity: 0.5, duration: 0.2 });
    };
    const onLinkLeave = () => {
      gsap.to(ring, { scale: 1, borderColor: 'rgba(255, 255, 255, 0.3)', duration: 0.3 });
      gsap.to(dot, { scale: 1, opacity: 1, duration: 0.2 });
    };

    // Listen on window for proper coordinate mapping
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    // Track interactive elements
    const attachHoverListeners = () => {
      const interactives = document.querySelectorAll('a, button, [role="button"], .magnetic, .stream-card, .preset-btn, .nav-item');
      interactives.forEach(el => {
        el.addEventListener('mouseenter', onLinkEnter);
        el.addEventListener('mouseleave', onLinkLeave);
      });
      return interactives;
    };

    const interactives = attachHoverListeners();

    // Re-attach on DOM changes (e.g., view switches)
    const observer = new MutationObserver(() => {
      attachHoverListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', onLinkEnter);
        el.removeEventListener('mouseleave', onLinkLeave);
      });
      observer.disconnect();
    };
  }, []);

  // Don't render on touch devices
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <>
      <div ref={dotRef} className="cursor-dot" style={{ opacity: visible ? 1 : 0 }} />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: visible ? 0.5 : 0 }} />
    </>
  );
}

function GrainOverlay() {
  return <div className="grain-overlay" />;
}

function ScrollIndicator() {
  return (
    <div className="scroll-indicator">
      <div className="scroll-indicator-line" />
      <span className="scroll-indicator-text">Scroll</span>
    </div>
  );
}

function TextReveal({ children, tag = 'span', delay = 0, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const text = ref.current.textContent;
    const chars = text.split('');
    ref.current.innerHTML = chars.map((char, i) =>
      `<span class="char" style="display:inline-block;opacity:0;transform:translateY(50px)">${char === ' ' ? '&nbsp;' : char}</span>`
    ).join('');

    const charElements = ref.current.querySelectorAll('.char');
    gsap.from(charElements, {
      opacity: 0,
      y: 50,
      stagger: 0.03,
      delay,
      duration: 0.6,
      ease: 'power2.out',
    });
  }, [delay]);

  const Tag = tag;
  return <Tag ref={ref} className={`text-reveal ${className}`}>{children}</Tag>;
}

function MagneticButton({ children, onClick, className = '', disabled = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || disabled) return;

    const handleMouseMove = (e) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.2;
      const dy = (e.clientY - cy) * 0.2;

      gsap.to(ref.current, {
        x: dx,
        y: dy,
        duration: 0.5,
        overwrite: 'auto',
      });
    };

    const handleMouseLeave = () => {
      if (!ref.current) return;
      gsap.to(ref.current, { x: 0, y: 0, duration: 0.5 });
    };

    ref.current.addEventListener('mousemove', handleMouseMove);
    ref.current.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (ref.current) {
        ref.current.removeEventListener('mousemove', handleMouseMove);
        ref.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [disabled]);

  return (
    <button
      ref={ref}
      className={`magnetic-button magnetic ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ArchitectureItem({ title, detail, index }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      gsap.fromTo(contentRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    } else {
      gsap.to(contentRef.current, { height: 0, opacity: 0, duration: 0.4, ease: 'power2.inOut' });
    }
  }, [open]);

  return (
    <div className={`architecture-item ${open ? 'open' : ''}`}>
      <button
        className="architecture-item-header"
        onClick={() => setOpen(!open)}
      >
        <span className="architecture-item-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="architecture-item-title">{title}</span>
        <span className="architecture-item-toggle">{open ? '−' : '+'}</span>
      </button>
      <div ref={contentRef} className="architecture-item-detail" style={{ height: 0, overflow: 'hidden' }}>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function ProgressRing({ percent, status, size = 56 }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  const cls = status?.toLowerCase();

  return (
    <div className="card-ring">
      <svg width={size} height={size} className="progress-ring-svg">
        <circle
          className="progress-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={`progress-ring-fill ${cls}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  );
}

function StreamCard({ stream, onClick }) {
  const cardRef = useRef(null);
  const pct = parseFloat(stream.totalAmount) > 0
    ? (parseFloat(stream.totalStreamed) / parseFloat(stream.totalAmount)) * 100
    : 0;
  const isDone = stream._done;
  const displayStatus = isDone && stream.status === 'STREAMING'
    ? (stream._stuck ? 'STUCK' : 'COMPLETED')
    : stream.status;
  const cls = displayStatus?.toLowerCase();

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / centerY * -6;
    const rotateY = (x - centerX) / centerX * 6;
    cardRef.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
    }
  };

  return (
    <div
      ref={cardRef}
      className={`stream-card ${isDone ? 'completed-card' : ''}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-specular" />
      <div className="card-corner-accent" />

      {/* Header: Token icon + ID + Status */}
      <div className="card-top">
        <div className="card-token-row">
          <div className="card-token-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="#00ef8b" opacity="0.15" />
              <path d="M10 5v7m0 0l-3-2.5m3 2.5l3-2.5" stroke="#00ef8b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="15" r="1" fill="#00ef8b" />
            </svg>
          </div>
          <span className="card-id">Stream #{stream.id}</span>
        </div>
        <span className={`card-status-badge ${cls}`}>
          <span className="badge-dot" />
          {displayStatus}
        </span>
      </div>

      {/* Stats grid */}
      <div className="card-stats-grid">
        <div className="card-stat">
          <span className="card-stat-label">Amount</span>
          <span className="card-stat-value card-amount">
            {formatFlow(stream.totalAmount, 2)}
            <span className="card-amount-suffix">FLOW</span>
          </span>
        </div>
        <div className="card-stat">
          <span className="card-stat-label">Streamed</span>
          <span className="card-stat-value">
            {formatFlow(stream.totalStreamed, 2)}
            <span className="card-amount-suffix">FLOW</span>
          </span>
        </div>
        <div className="card-stat card-stat-full">
          <span className="card-stat-label">Recipient</span>
          <span className="card-stat-value card-dest">{formatAddr(stream.destinationAddress)}</span>
        </div>
      </div>

      {/* Liquid progress bar */}
      <div className="card-progress-section">
        <div className="card-progress-header">
          <span className="card-progress-label">Progress</span>
          <span className="card-progress-pct">{Math.min(pct, 100).toFixed(0)}%</span>
        </div>
        <div className="card-liquid-bar">
          <div
            className={`card-liquid-fill ${cls}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          >
            <div className="card-liquid-shimmer" />
          </div>
        </div>
      </div>

      {/* View Stream button */}
      <div className="card-footer">
        <span className="card-view-btn">
          View Stream
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="12" r="1.2" fill="#09090b" />
    </svg>
  );
}

function Header({ user, view, setView, authenticate, unauthenticate }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : 'header-transparent'}`}>
      <div className="header-inner">
        <div className="header-left">
          <div className="logo magnetic">
            <div className="logo-mark"><LogoMark /></div>
            <span className="logo-text">StreamVest</span>
          </div>
          {user?.addr && (
            <nav className="nav">
              <button
                className={`nav-item magnetic ${view === 'dashboard' ? 'active' : ''}`}
                onClick={() => setView('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`nav-item magnetic ${view === 'create' ? 'active' : ''}`}
                onClick={() => setView('create')}
              >
                Create
              </button>
            </nav>
          )}
        </div>
        {user?.addr ? (
          <button className="wallet-btn magnetic" onClick={unauthenticate} title="Disconnect">
            <span className="wallet-dot" />
            {formatAddr(user.addr)}
          </button>
        ) : (
          <button className="wallet-btn wallet-btn-connect magnetic" onClick={authenticate}>
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}

function Dashboard({ user, onSelectStream, onNavigateCreate }) {
  const { data: streams, isLoading } = useFlowQuery({
    cadence: GET_ALL_STREAMS,
    args: (arg, t) => [arg(user.addr, t.Address)],
    query: { enabled: !!user?.addr, refetchInterval: 15000 },
  });

  const { activeStreams, completedStreams } = useMemo(() => {
    const all = (streams || []).map(s => {
      const amt = parseFloat(s.totalAmount || 0);
      const streamed = parseFloat(s.totalStreamed || 0);
      const pct = amt > 0 ? (streamed / amt) * 100 : 0;
      const isDone = s.isActive === false || s.status !== 'STREAMING' || pct >= 99.5;
      const isStuck = isDone && s.status === 'STREAMING' && pct < 99.5;
      return { ...s, _pct: pct, _stuck: isStuck, _done: isDone };
    });

    const active = all
      .filter(s => !s._done)
      .sort((a, b) => {
        const remA = 1 - (parseFloat(a.totalStreamed) / parseFloat(a.totalAmount));
        const remB = 1 - (parseFloat(b.totalStreamed) / parseFloat(b.totalAmount));
        return remB - remA;
      });

    const completed = all
      .filter(s => s._done)
      .sort((a, b) => parseFloat(b.totalAmount || 0) - parseFloat(a.totalAmount || 0));

    return { activeStreams: active, completedStreams: completed };
  }, [streams]);

  const stats = useMemo(() => {
    if (!streams) return { total: 0, locked: 0, active: 0 };
    return {
      total: streams.length,
      locked: streams.reduce((s, st) => s + parseFloat(st.totalAmount || 0), 0),
      active: activeStreams.length,
    };
  }, [streams, activeStreams]);

  if (isLoading) {
    return <div className="loading"><div className="spinner" />Loading streams...</div>;
  }

  const total = (streams || []).length;

  return (
    <>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Streams</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Locked</div>
          <div className="stat-value">
            {formatFlow(stats.locked, 2)}
            <span className="stat-suffix">FLOW</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value">{stats.active}</div>
        </div>
      </div>

      {total === 0 ? (
        <div className="empty">
          <div className="empty-title">No streams yet</div>
          <div className="empty-desc">Create your first streaming vest to get started.</div>
          <button className="empty-btn magnetic" onClick={onNavigateCreate}>+ Create Stream</button>
        </div>
      ) : (
        <>
          {activeStreams.length > 0 && (
            <div className="streams-container">
              <div className="section-label">
                <span className="section-title">Active Streams</span>
                <span className="section-count">{activeStreams.length}</span>
              </div>
              <div className="stream-cards">
                {activeStreams.map(stream => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    onClick={() => onSelectStream(stream.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {completedStreams.length > 0 && (
            <div className={`streams-container ${activeStreams.length > 0 ? 'section-divider' : ''}`}>
              <div className="section-label">
                <span className="section-title">Completed</span>
                <span className="section-count">{completedStreams.length}</span>
              </div>
              <div className="stream-cards">
                {completedStreams.map(stream => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    onClick={() => onSelectStream(stream.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function StreamDetailView({ user, streamId, onBack }) {
  const { data: detail, isLoading: loadingStatus } = useFlowQuery({
    cadence: GET_STREAM_STATUS,
    args: (arg, t) => [
      arg(user.addr, t.Address),
      arg(String(streamId), t.UInt64),
    ],
    query: { enabled: !!user?.addr && streamId != null, refetchInterval: 10000 },
  });

  const { data: display, isLoading: loadingSvg } = useFlowQuery({
    cadence: GET_NFT_DISPLAY,
    args: (arg, t) => [
      arg(user.addr, t.Address),
      arg(String(streamId), t.UInt64),
    ],
    query: { enabled: !!user?.addr && streamId != null, refetchInterval: 10000 },
  });

  const loading = loadingStatus || loadingSvg;
  const svg = display?.rawSVG || null;

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading stream...</div>;
  }
  if (!detail) {
    return <div className="loading">Stream not found</div>;
  }

  const progress = parseFloat(detail.progressPercent || 0);
  const cls = detail.status?.toLowerCase();

  return (
    <>
      <button className="detail-back magnetic" onClick={onBack}>&larr; Back to streams</button>

      <div className="detail-header">
        <span className="detail-title">Stream #{detail.id}</span>
        <span className={`card-status-badge ${cls}`}>
          <span className="badge-dot" />
          {detail.status}
        </span>
      </div>

      {svg && (
        <div className="nft-svg-container">
          <div className="nft-svg" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}

      <div className="detail-progress">
        <div className="detail-progress-bar">
          <div
            className={`detail-progress-fill progress-fill ${cls}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="detail-progress-labels">
          <span>{progress.toFixed(1)}% complete</span>
          <span style={{ color: 'var(--text-tertiary)' }}>
            {formatFlow(detail.totalStreamed)} / {formatFlow(detail.totalAmount)} FLOW
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-cell">
          <div className="detail-cell-label">Total Amount</div>
          <div className="detail-cell-value">{formatFlow(detail.totalAmount)} FLOW</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell-label">Streamed</div>
          <div className="detail-cell-value">{formatFlow(detail.totalStreamed)} FLOW</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell-label">Remaining</div>
          <div className="detail-cell-value">{formatFlow(detail.remaining)} FLOW</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell-label">Claimable Now</div>
          <div
            className="detail-cell-value"
            style={parseFloat(detail.claimable) > 0 ? { color: 'var(--accent)' } : undefined}
          >
            {formatFlow(detail.claimable)} FLOW
          </div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell-label">Stream Rate</div>
          <div className="detail-cell-value">{formatRate(detail.streamRate)}</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell-label">Destination</div>
          <div className="detail-cell-value">{detail.destinationAddress}</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell-label">Start Time</div>
          <div className="detail-cell-value">{formatDate(detail.startTime)}</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell-label">End Time</div>
          <div className="detail-cell-value">{formatDate(detail.endTime)}</div>
        </div>
      </div>
    </>
  );
}

function CreateStream({ user, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [durIdx, setDurIdx] = useState(null);
  const [intIdx, setIntIdx] = useState(null);

  const { mutate, data: txId, isPending } = useFlowMutate();
  const { transactionStatus } = useFlowTransactionStatus({ id: txId });

  const durationSec = durIdx !== null ? DURATION_PRESETS[durIdx].seconds : 0;
  const intervalSec = intIdx !== null ? INTERVAL_PRESETS[intIdx].seconds : 0;

  const numTriggers = intervalSec > 0 ? Math.ceil(durationSec / intervalSec) : 0;
  const totalFees = numTriggers * FEE_PER_TRIGGER;
  const amountNum = parseFloat(amount) || 0;
  const totalCost = amountNum + totalFees;
  const feeRatio = amountNum > 0 ? totalFees / amountNum : 0;

  const isValid =
    amountNum > 0 &&
    destination.startsWith('0x') &&
    destination.length >= 8 &&
    durationSec > 0 &&
    intervalSec > 0 &&
    intervalSec <= durationSec;

  const isSealed = transactionStatus?.statusString === 'SEALED';
  const isErrored = transactionStatus?.errorMessage;
  const isBusy = isPending || (txId && !isSealed && !isErrored);

  React.useEffect(() => {
    if (isSealed) {
      const timer = setTimeout(() => onSuccess(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSealed, onSuccess]);

  const handleSubmit = () => {
    if (!isValid || isBusy) return;
    mutate({
      cadence: MINT_AND_SCHEDULE,
      args: (arg, t) => [
        arg(toFixedCadence(amountNum), t.UFix64),
        arg(normalizeAddress(destination), t.Address),
        arg(toFixedCadence(durationSec), t.UFix64),
        arg(toFixedCadence(intervalSec), t.UFix64),
        arg(toFixedCadence(totalFees), t.UFix64),
      ],
      limit: 999,
    });
  };

  const statusLabel = isPending
    ? 'Waiting for approval...'
    : txId && !isSealed && !isErrored
    ? 'Confirming on-chain...'
    : 'Create Stream';

  return (
    <div className="form-card">
      <div className="form-title">Create Stream</div>
      <div className="form-subtitle">Lock FLOW tokens with autonomous scheduled delivery</div>

      <div className="field">
        <label className="field-label">Amount</label>
        <div className="field-input-wrap">
          <input
            className="field-input has-suffix"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
          <span className="field-suffix">FLOW</span>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Recipient</label>
        <input
          className="field-input"
          type="text"
          placeholder="0x..."
          value={destination}
          onChange={e => setDestination(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label">Duration</label>
        <div className="presets">
          {DURATION_PRESETS.map((p, i) => (
            <button
              key={p.label}
              className={`preset-btn magnetic ${durIdx === i ? 'selected' : ''}`}
              onClick={() => setDurIdx(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label">Delivery Interval</label>
        <div className="presets">
          {INTERVAL_PRESETS.map((p, i) => (
            <button
              key={p.label}
              className={`preset-btn magnetic ${intIdx === i ? 'selected' : ''}`}
              onClick={() => setIntIdx(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isValid && (
        <>
          <div className="divider" />
          <div className="cost-row">
            <span className="cost-label">Stream amount</span>
            <span className="cost-value">{formatFlow(amountNum)} FLOW</span>
          </div>
          <div className="cost-row">
            <div>
              <div className="cost-label">Scheduling fees</div>
              <div className="cost-detail">{numTriggers.toLocaleString()} triggers × {FEE_PER_TRIGGER} FLOW</div>
            </div>
            <span className="cost-value">{formatFlow(totalFees)} FLOW</span>
          </div>
          <div className="divider" />
          <div className="cost-row total">
            <span className="cost-label">Total</span>
            <span className="cost-value">{formatFlow(totalCost)} FLOW</span>
          </div>

          {feeRatio > 0.1 && (
            <div className="fee-warning">
              Scheduling fees are {(feeRatio * 100).toFixed(0)}% of stream amount. Consider a longer interval to reduce costs.
            </div>
          )}
        </>
      )}

      <MagneticButton
        className="submit-btn"
        disabled={!isValid || isBusy}
        onClick={handleSubmit}
      >
        {statusLabel}
      </MagneticButton>

      {isSealed && (
        <div className="tx-status tx-success">
          Stream created!{' '}
          <a
            href={`https://www.flowscan.io/tx/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on FlowScan &rarr;
          </a>
        </div>
      )}

      {isErrored && (
        <div className="tx-status tx-error">{transactionStatus.errorMessage}</div>
      )}
    </div>
  );
}

function LandingPage({ onConnect }) {
  useSmoothScroll();

  // GSAP scroll animations for sections
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate mechanic steps on scroll
      gsap.utils.toArray('.mechanic-step').forEach((step, i) => {
        gsap.from(step, {
          opacity: 0,
          y: 60,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });

      // Animate architecture items on scroll
      gsap.utils.toArray('.architecture-item').forEach((item) => {
        gsap.from(item, {
          opacity: 0,
          x: -30,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="landing-page">
      {/* ═══ HERO ═══ */}
      <section className="hero-section">
        <div className="hero-atmosphere">
          <div className="hero-glow-orb hero-glow-cyan" />
          <div className="hero-glow-orb hero-glow-violet" />
        </div>

        <div className="hero-grid">
          <div className="hero-text">
            <h1 className="hero-headline">
              <span className="hero-line">
                <TextReveal tag="span" className="hero-word">Streaming</TextReveal>
              </span>
              <span className="hero-line">
                <TextReveal tag="span" className="hero-word hero-word-accent" delay={0.15}>Vests</TextReveal>
              </span>
            </h1>

            <p className="hero-subtitle">
              Mint your vesting schedule as a sovereign digital contract.
              Tokens flow like clockwork, governed by immutable Flow runtime,
              not human intermediaries.
            </p>

            <div className="hero-actions">
              <button className="hero-connect-btn" onClick={onConnect}>
                <span className="hero-connect-text">Connect Wallet</span>
                <span className="hero-connect-fill" />
              </button>
              <a href="#how-it-works" className="hero-learn-link">
                How it works
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 3v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-container">
              <div className="hero-orb hero-orb-1" />
              <div className="hero-orb hero-orb-2" />
              <div className="hero-orb hero-orb-3" />
              <div className="hero-visual-card">
                <div className="hero-card-header">
                  <div className="hero-card-dot" />
                  <div className="hero-card-dot" />
                  <div className="hero-card-dot" />
                </div>
                <div className="hero-card-body">
                  <div className="hero-card-stream">
                    <div className="hero-stream-bar" />
                    <div className="hero-stream-bar hero-stream-bar-2" />
                    <div className="hero-stream-bar hero-stream-bar-3" />
                  </div>
                  <div className="hero-card-stats">
                    <div className="hero-stat-block">
                      <span className="hero-stat-label">Streaming</span>
                      <span className="hero-stat-value">1,250.00</span>
                    </div>
                    <div className="hero-stat-block">
                      <span className="hero-stat-label">Delivered</span>
                      <span className="hero-stat-value">847.32</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-scroll-indicator">
          <span className="hero-scroll-label">Scroll</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="mechanics-section" id="how-it-works">
        <div className="mechanics-container">
          <span className="section-eyebrow">How It Works</span>

          <div className="mechanics-editorial">
            {[
              {
                num: '01',
                title: 'Initialize Stream',
                desc: 'Deposit FLOW. Define cadence. The protocol handles the rest.',
              },
              {
                num: '02',
                title: 'Autonomous Distribution',
                desc: 'Every interval, micro-transactions execute with atomic precision. No gas wars. No missed claims.',
              },
              {
                num: '03',
                title: 'Sovereign Tracking',
                desc: 'Monitor progress in real-time. Every delivery is transparent, verifiable, and immutable.',
              },
            ].map((step, i) => (
              <div key={i} className="mechanic-step">
                <div className="mechanic-step-left">
                  <span className="mechanic-ghost-num">{step.num}</span>
                  <h3 className="mechanic-step-title">{step.title}</h3>
                </div>
                <div className="mechanic-step-right">
                  <div className="mechanic-step-line" />
                  <p className="mechanic-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ UNDER THE HOOD ═══ */}
      <section className="architecture-section">
        <div className="architecture-container">
          <span className="section-eyebrow">Under the Hood</span>

          <div className="architecture-list">
            {[
              { title: 'NFT-Based Streams', detail: 'Each vesting schedule is a unique NFT with embedded state, progress tracking, and on-chain SVG visualization.' },
              { title: 'Flow Transaction Scheduler', detail: 'Leverages Flow\'s native FlowTransactionScheduler for autonomous, gas-efficient stream execution without external keepers.' },
              { title: 'Atomic Delivery', detail: 'Token transfers execute as atomic on-chain transactions. No partial states, no race conditions, no manual intervention.' },
              { title: 'Composable Primitive', detail: 'StreamVest NFTs implement MetadataViews and standard interfaces, making them composable with any Flow ecosystem tool.' },
            ].map((item, i) => (
              <ArchitectureItem key={i} title={item.title} detail={item.detail} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER CTA ═══ */}
      <section className="footer-section">
        <div className="footer-glow" />
        <div className="footer-cta-container">
          <h2 className="footer-cta-text">
            Enter the Stream
          </h2>
          <p className="footer-cta-sub">Autonomous token vesting on Flow</p>
          <button className="hero-connect-btn footer-connect" onClick={onConnect}>
            <span className="hero-connect-text">Connect Wallet</span>
            <span className="hero-connect-fill" />
          </button>
        </div>
        <div className="footer-meta">
          <div className="footer-contract">
            <span className="footer-contract-label">Contract</span>
            <button
              className="footer-contract-addr magnetic"
              onClick={(e) => {
                navigator.clipboard.writeText('0x5ec90e3dcf0067c4');
                const icon = e.currentTarget.querySelector('.copy-icon');
                if (icon) {
                  const orig = icon.textContent;
                  icon.textContent = '✓';
                  setTimeout(() => { icon.textContent = orig; }, 2000);
                }
              }}
            >
              0x5ec90e3dcf0067c4
              <span className="copy-icon">⧉</span>
            </button>
          </div>
          <div className="footer-links">
            <a href="https://github.com/Doodlifts/streamvest" target="_blank" rel="noopener noreferrer" className="footer-link magnetic">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
              GitHub
            </a>
            <a href="https://www.flowscan.io/account/0x5ec90e3dcf0067c4" target="_blank" rel="noopener noreferrer" className="footer-link magnetic">
              FlowScan
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Preloader({ onComplete }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const percentRef = useRef(null);
  const [status, setStatus] = useState('loading');

  // Canvas animation — large cinematic water droplets
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h, dpr;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const droplets = [];
    const ripples = [];
    const waterLevel = h * 0.75;
    let gravityMultiplier = 1;

    class Droplet {
      constructor(scattered) {
        this.reset(scattered);
      }
      reset(scattered) {
        this.x = w * 0.15 + Math.random() * w * 0.7;
        this.y = scattered ? Math.random() * waterLevel * 0.6 : -30 - Math.random() * 200;
        this.radius = 8 + Math.random() * 17;
        this.speed = 0.3 + Math.random() * 0.8;
        this.drift = (Math.random() - 0.5) * 0.15;
        this.opacity = 0.5 + Math.random() * 0.5;
        this.glowSize = this.radius * 3;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.01 + Math.random() * 0.02;
      }
      update() {
        this.speed += 0.02 * gravityMultiplier;
        this.y += this.speed;
        this.wobble += this.wobbleSpeed;
        this.x += this.drift + Math.sin(this.wobble) * 0.3;
        if (this.y + this.radius > waterLevel) {
          ripples.push(new Ripple(this.x, waterLevel, this.radius));
          this.reset(false);
        }
      }
      draw(ctx) {
        ctx.save();
        // Outer glow
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowSize);
        glow.addColorStop(0, `rgba(0, 225, 255, ${this.opacity * 0.2})`);
        glow.addColorStop(0.5, `rgba(0, 225, 255, ${this.opacity * 0.05})`);
        glow.addColorStop(1, 'rgba(0, 225, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Teardrop body
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius * 1.4);
        ctx.bezierCurveTo(
          this.x + this.radius * 0.6, this.y - this.radius * 0.6,
          this.x + this.radius, this.y + this.radius * 0.3,
          this.x, this.y + this.radius
        );
        ctx.bezierCurveTo(
          this.x - this.radius, this.y + this.radius * 0.3,
          this.x - this.radius * 0.6, this.y - this.radius * 0.6,
          this.x, this.y - this.radius * 1.4
        );
        const bodyGrad = ctx.createLinearGradient(this.x, this.y - this.radius, this.x, this.y + this.radius);
        bodyGrad.addColorStop(0, 'rgba(0, 225, 255, 0.9)');
        bodyGrad.addColorStop(0.5, 'rgba(0, 200, 240, 0.6)');
        bodyGrad.addColorStop(1, 'rgba(123, 97, 255, 0.4)');
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Inner highlight
        ctx.globalAlpha = this.opacity * 0.7;
        ctx.beginPath();
        ctx.ellipse(this.x - this.radius * 0.2, this.y - this.radius * 0.3, this.radius * 0.25, this.radius * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.restore();
      }
    }

    class Ripple {
      constructor(x, y, dropRadius) {
        this.x = x;
        this.y = y;
        this.radius = dropRadius;
        this.maxRadius = 60 + dropRadius * 6;
        this.opacity = 0.5;
        this.lineWidth = 2;
      }
      update() {
        this.radius += 2;
        this.opacity -= 0.006;
        this.lineWidth = Math.max(0.3, this.lineWidth - 0.015);
      }
      draw(ctx) {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = '#00e1ff';
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Second inner ring
        if (this.radius > 20) {
          ctx.globalAlpha = this.opacity * 0.4;
          ctx.beginPath();
          ctx.ellipse(this.x, this.y, this.radius * 0.6, this.radius * 0.15, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      get isDead() { return this.opacity <= 0 || this.radius > this.maxRadius; }
    }

    // Initialize fewer, larger droplets spread out
    for (let i = 0; i < 15; i++) {
      droplets.push(new Droplet(true));
    }

    let time = 0;
    function drawWaterSurface() {
      ctx.save();
      ctx.globalAlpha = 0.1;
      const grad = ctx.createLinearGradient(0, waterLevel - 5, 0, waterLevel + 30);
      grad.addColorStop(0, 'rgba(0, 225, 255, 0.15)');
      grad.addColorStop(1, 'rgba(0, 225, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, waterLevel);
      for (let x = 0; x <= w; x += 3) {
        const y = waterLevel + Math.sin(x * 0.015 + time) * 4 + Math.sin(x * 0.004 + time * 0.3) * 6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      // Surface line
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#00e1ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = waterLevel + Math.sin(x * 0.015 + time) * 4 + Math.sin(x * 0.004 + time * 0.3) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    let animId;
    function animate() {
      ctx.clearRect(0, 0, w, h);
      time += 0.015;

      if (Math.random() < 0.03) {
        droplets.push(new Droplet(false));
      }

      for (let i = droplets.length - 1; i >= 0; i--) {
        droplets[i].update();
        droplets[i].draw(ctx);
      }
      while (droplets.length > 20) droplets.shift();

      drawWaterSurface();

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].update();
        ripples[i].draw(ctx);
        if (ripples[i].isDead) ripples.splice(i, 1);
      }

      animId = requestAnimationFrame(animate);
    }
    animate();

    canvasRef.current._setGravity = (mult) => { gravityMultiplier = mult; };

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Loading progress & exit
  useEffect(() => {
    let fontsLoaded = false;
    let windowLoaded = false;
    let progress = 0;
    const startTime = Date.now();
    const MIN_DISPLAY = 3000;

    document.fonts.ready.then(() => { fontsLoaded = true; });

    const onLoad = () => { windowLoaded = true; };
    if (document.readyState === 'complete') windowLoaded = true;
    else window.addEventListener('load', onLoad);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      if (elapsed < 800) {
        progress = Math.min(30, (elapsed / 800) * 30);
      } else if (elapsed < 2000) {
        progress = 30 + ((elapsed - 800) / 1200) * 40;
      } else if (elapsed < 2800) {
        progress = 70 + ((elapsed - 2000) / 800) * 20;
      } else {
        progress = Math.min(progress + 0.3, 95);
      }

      if (fontsLoaded && windowLoaded && elapsed >= MIN_DISPLAY) {
        progress = 100;
      }

      if (progressRef.current) {
        progressRef.current.style.width = progress + '%';
      }
      if (percentRef.current) {
        percentRef.current.textContent = Math.floor(progress) + '%';
      }

      if (progress >= 100) {
        clearInterval(interval);
        triggerExit();
      }
    }, 30);

    function triggerExit() {
      setStatus('exiting');
      if (canvasRef.current?._setGravity) {
        canvasRef.current._setGravity(6);
      }

      const tl = gsap.timeline({
        onComplete: () => {
          setStatus('done');
          if (onComplete) onComplete();
        }
      });

      tl.to('.preloader-brand', {
        scale: 1.15,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.in',
      })
      .to('.preloader-progress-wrap', {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
      }, '<+0.1')
      .to(containerRef.current, {
        clipPath: 'circle(0% at 50% 50%)',
        duration: 1.2,
        ease: 'power3.inOut',
      }, '-=0.3');
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('load', onLoad);
    };
  }, [onComplete]);

  if (status === 'done') return null;

  return (
    <div ref={containerRef} className="preloader" style={{ clipPath: 'circle(150% at 50% 50%)' }}>
      <canvas ref={canvasRef} className="preloader-canvas" />
      <div className="preloader-brand">
        <div className="preloader-logo">
          <div className="preloader-logo-mark">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 3 L27 12 L27 24 L18 33 L9 24 L9 12 Z" fill="url(#preloaderGrad)" />
              <defs>
                <linearGradient id="preloaderGrad" x1="9" y1="3" x2="27" y2="33">
                  <stop offset="0%" stopColor="#00e1ff" />
                  <stop offset="100%" stopColor="#7b61ff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="preloader-logo-text">StreamVest</span>
        </div>
        <div className="preloader-status">
          <span className="preloader-status-text">Initializing stream protocol</span>
          <span className="preloader-status-dots">...</span>
        </div>
        <div ref={percentRef} className="preloader-percent">0%</div>
      </div>
      <div className="preloader-progress-wrap">
        <div ref={progressRef} className="preloader-progress-bar" />
      </div>
    </div>
  );
}

function ErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) return fallback;

  try {
    return children;
  } catch {
    setHasError(true);
    return fallback;
  }
}

// ────────────────────────────────────────────────────────────
//  App
// ────────────────────────────────────────────────────────────

export default function App() {
  const { user, authenticate, unauthenticate } = useFlowCurrentUser();
  const [view, setView] = useState('dashboard');
  const [selectedStream, setSelectedStream] = useState(null);
  const [loading, setLoading] = useState(true);

  const isConnected = user?.addr;

  const handleSelectStream = (id) => {
    setSelectedStream(id);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedStream(null);
    setView('dashboard');
  };

  const handleCreateSuccess = () => {
    setView('dashboard');
  };

  return (
    <div className={`app ${loading ? 'app-loading' : ''}`}>
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <GrainOverlay />
      <CustomCursor />
      <Header
        user={user}
        view={view}
        setView={(v) => { setView(v); setSelectedStream(null); }}
        authenticate={authenticate}
        unauthenticate={unauthenticate}
      />
      <main className={`main ${!isConnected ? 'main-landing' : ''}`}>
        {!isConnected ? (
          <LandingPage onConnect={authenticate} />
        ) : view === 'dashboard' ? (
          <Dashboard
            user={user}
            onSelectStream={handleSelectStream}
            onNavigateCreate={() => setView('create')}
          />
        ) : view === 'create' ? (
          <CreateStream user={user} onSuccess={handleCreateSuccess} />
        ) : view === 'detail' && selectedStream != null ? (
          <StreamDetailView user={user} streamId={selectedStream} onBack={handleBack} />
        ) : null}
      </main>
    </div>
  );
}
