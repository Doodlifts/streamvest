import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as fcl from '@onflow/fcl';

// ────────────────────────────────────────────────────────────
//  FCL Configuration
// ────────────────────────────────────────────────────────────

fcl.config()
  .put("flow.network", "mainnet")
  .put("accessNode.api", "https://rest-mainnet.onflow.org")
  .put("discovery.wallet", "https://fcl-discovery.onflow.org/authn")
  .put("discovery.authn.endpoint", "https://fcl-discovery.onflow.org/api/authn")
  .put("app.detail.title", "StreamVest")
  .put("app.detail.icon", "https://i.imgur.com/YbFxBJQ.png")
  .put("0xStreamVest", "0x5ec90e3dcf0067c4")
  .put("0xStreamVestSchedulerV2", "0x5ec90e3dcf0067c4")
  .put("0xNonFungibleToken", "0x1d7e57aa55817448")
  .put("0xMetadataViews", "0x1d7e57aa55817448")
  .put("0xFungibleToken", "0xf233dcee88fe0abe")
  .put("0xFlowToken", "0x1654653399040a61")
  .put("0xFlowTransactionScheduler", "0xe467b9dd11fa00df");

// ────────────────────────────────────────────────────────────
//  Cadence Scripts & Transactions
// ────────────────────────────────────────────────────────────

const GET_ALL_STREAMS = `
import StreamVest from 0xStreamVest
import NonFungibleToken from 0xNonFungibleToken

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
import StreamVest from 0xStreamVest
import NonFungibleToken from 0xNonFungibleToken

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
import StreamVest from 0xStreamVest
import NonFungibleToken from 0xNonFungibleToken
import MetadataViews from 0xMetadataViews

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
import StreamVest from 0xStreamVest
import StreamVestSchedulerV2 from 0xStreamVestSchedulerV2
import NonFungibleToken from 0xNonFungibleToken
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken
import FlowTransactionScheduler from 0xFlowTransactionScheduler

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

function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = fcl.currentUser.subscribe(setUser);
    return unsub;
  }, []);

  const connect = useCallback(() => fcl.authenticate(), []);
  const disconnect = useCallback(() => fcl.unauthenticate(), []);

  return { user, connect, disconnect };
}

function useStreams(address) {
  const [streams, setStreams] = useState(null);
  const [error, setError] = useState(null);

  const fetchStreams = useCallback(async () => {
    if (!address) return;
    try {
      const result = await fcl.query({
        cadence: GET_ALL_STREAMS,
        args: (arg, t) => [arg(address, t.Address)],
      });
      setStreams(result || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch streams:', err);
      setError(err.message);
      if (streams === null) setStreams([]);
    }
  }, [address]);

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 15000);
    return () => clearInterval(interval);
  }, [fetchStreams]);

  return { streams, error, refresh: fetchStreams };
}

function useStreamDetail(address, streamId) {
  const [detail, setDetail] = useState(null);
  const [svg, setSvg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address || streamId == null) return;
    let cancelled = false;

    async function load() {
      try {
        const [statusResult, displayResult] = await Promise.all([
          fcl.query({
            cadence: GET_STREAM_STATUS,
            args: (arg, t) => [
              arg(address, t.Address),
              arg(String(streamId), t.UInt64),
            ],
          }),
          fcl.query({
            cadence: GET_NFT_DISPLAY,
            args: (arg, t) => [
              arg(address, t.Address),
              arg(String(streamId), t.UInt64),
            ],
          }),
        ]);
        if (!cancelled) {
          setDetail(statusResult);
          setSvg(displayResult?.rawSVG || null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load stream detail:', err);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [address, streamId]);

  return { detail, svg, loading };
}

// ────────────────────────────────────────────────────────────
//  Components
// ────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="12" r="1.2" fill="#09090b" />
    </svg>
  );
}

function Header({ user, view, setView, connect, disconnect }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-mark"><LogoMark /></div>
          StreamVest
        </div>
        {user?.addr && (
          <nav className="nav">
            <button
              className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-item ${view === 'create' ? 'active' : ''}`}
              onClick={() => setView('create')}
            >
              Create
            </button>
          </nav>
        )}
      </div>
      {user?.addr ? (
        <button className="wallet-btn" onClick={disconnect} title="Disconnect wallet">
          <span className="wallet-dot" />
          {formatAddr(user.addr)}
        </button>
      ) : (
        <button className="wallet-btn wallet-btn-connect" onClick={connect}>
          Connect Wallet
        </button>
      )}
    </header>
  );
}

function Dashboard({ user, onSelectStream, onNavigateCreate }) {
  const { streams, refresh } = useStreams(user.addr);

  const stats = useMemo(() => {
    if (!streams) return { total: 0, locked: 0, active: 0 };
    return {
      total: streams.length,
      locked: streams.reduce((s, st) => s + parseFloat(st.totalAmount || 0), 0),
      active: streams.filter(s => s.status === 'STREAMING').length,
    };
  }, [streams]);

  if (streams === null) {
    return <div className="loading"><div className="spinner" />Loading streams...</div>;
  }

  return (
    <>
      <div className="stats-row">
        <div className="stat">
          <div className="stat-label">Total Streams</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total Locked</div>
          <div className="stat-value">
            {formatFlow(stats.locked, 2)}
            <span className="stat-suffix">FLOW</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Active</div>
          <div className="stat-value">{stats.active}</div>
        </div>
      </div>

      <div className="section-header">
        <span className="section-title">Streams</span>
      </div>

      {streams.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No streams yet</div>
          <div className="empty-desc">Create your first streaming vest to get started.</div>
          <button className="empty-btn" onClick={onNavigateCreate}>+ Create Stream</button>
        </div>
      ) : (
        <div className="stream-list">
          {streams.map(stream => {
            const pct = parseFloat(stream.totalAmount) > 0
              ? (parseFloat(stream.totalStreamed) / parseFloat(stream.totalAmount)) * 100
              : 0;
            const cls = stream.status?.toLowerCase();
            return (
              <div
                key={stream.id}
                className="stream-row"
                onClick={() => onSelectStream(stream.id)}
              >
                <span className="stream-id">#{stream.id}</span>
                <span className="stream-dest">{formatAddr(stream.destinationAddress)}</span>
                <span className="stream-amount">{formatFlow(stream.totalAmount)} FLOW</span>
                <div className="stream-progress-cell">
                  <div className="progress-bar">
                    <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="stream-status">
                  <span className={`status-dot ${cls}`} />
                  <span style={{ color: `var(--status-${cls})` }}>{stream.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function StreamDetailView({ user, streamId, onBack }) {
  const { detail, svg, loading } = useStreamDetail(user.addr, streamId);

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
      <button className="detail-back" onClick={onBack}>&larr; Back to streams</button>

      <div className="detail-header">
        <span className="detail-title">Stream #{detail.id}</span>
        <div className="stream-status">
          <span className={`status-dot ${cls}`} />
          <span style={{ color: `var(--status-${cls})` }}>{detail.status}</span>
        </div>
      </div>

      {svg && (
        <div className="nft-svg-container">
          <div
            className="nft-svg"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
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
  const [txStatus, setTxStatus] = useState(null);

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

  const isBusy = txStatus === 'sending' || txStatus === 'confirming';

  const handleSubmit = async () => {
    if (!isValid || isBusy) return;
    setTxStatus('sending');

    try {
      const txId = await fcl.mutate({
        cadence: MINT_AND_SCHEDULE,
        args: (arg, t) => [
          arg(toFixedCadence(amountNum), t.UFix64),
          arg(normalizeAddress(destination), t.Address),
          arg(toFixedCadence(durationSec), t.UFix64),
          arg(toFixedCadence(intervalSec), t.UFix64),
          arg(toFixedCadence(totalFees), t.UFix64),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 999,
      });

      setTxStatus('confirming');
      await fcl.tx(txId).onceSealed();
      setTxStatus({ success: txId });
      setTimeout(() => onSuccess(), 3000);
    } catch (err) {
      console.error('Transaction failed:', err);
      setTxStatus({ error: err.message || 'Transaction failed' });
    }
  };

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
              className={`preset-btn ${durIdx === i ? 'selected' : ''}`}
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
              className={`preset-btn ${intIdx === i ? 'selected' : ''}`}
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
              <div className="cost-detail">{numTriggers.toLocaleString()} triggers &times; {FEE_PER_TRIGGER} FLOW</div>
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

      <button
        className="submit-btn"
        disabled={!isValid || isBusy}
        onClick={handleSubmit}
      >
        {txStatus === 'sending'
          ? 'Waiting for approval...'
          : txStatus === 'confirming'
          ? 'Confirming on-chain...'
          : 'Create Stream'}
      </button>

      {txStatus?.success && (
        <div className="tx-status tx-success">
          Stream created!{' '}
          <a
            href={`https://www.flowscan.io/tx/${txStatus.success}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on FlowScan &rarr;
          </a>
        </div>
      )}

      {txStatus?.error && (
        <div className="tx-status tx-error">{txStatus.error}</div>
      )}
    </div>
  );
}

function LandingPage({ onConnect }) {
  return (
    <div className="landing">
      <h1 className="landing-title">
        Streaming vests<br />
        <span className="landing-accent">on Flow</span>
      </h1>
      <p className="landing-subtitle">
        Lock tokens into NFTs that automatically stream to any address.
        No intermediaries, no manual claims. Fully autonomous, fully on-chain.
      </p>
      <button className="landing-connect" onClick={onConnect}>
        Connect Wallet
      </button>

      <div className="landing-features">
        <div>
          <div className="feature-number">01</div>
          <div className="feature-title">Lock & Schedule</div>
          <div className="feature-desc">
            Deposit FLOW with a vesting schedule. An NFT is minted as your proof of stream.
          </div>
        </div>
        <div>
          <div className="feature-number">02</div>
          <div className="feature-title">Auto-Stream</div>
          <div className="feature-desc">
            Tokens are delivered automatically at your chosen interval via Flow's native scheduler.
          </div>
        </div>
        <div>
          <div className="feature-number">03</div>
          <div className="feature-title">Track On-Chain</div>
          <div className="feature-desc">
            Monitor progress in real-time. Every delivery is transparent and verifiable.
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  App
// ────────────────────────────────────────────────────────────

export default function App() {
  const { user, connect, disconnect } = useCurrentUser();
  const [view, setView] = useState('dashboard');
  const [selectedStream, setSelectedStream] = useState(null);

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
    <div className="app">
      <Header
        user={user}
        view={view}
        setView={(v) => { setView(v); setSelectedStream(null); }}
        connect={connect}
        disconnect={disconnect}
      />
      <main className="main">
        {!isConnected ? (
          <LandingPage onConnect={connect} />
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
