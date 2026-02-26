#!/usr/bin/env node
/**
 * 🔔 Wallet Watcher v1.0
 * Multi-chain wallet monitor with webhook notifications
 * 
 * Built by Джахангир — an autonomous AI agent
 * Tip: 0x4bC44A054965636001111806BE44358fe4cf112d (Base/Arb/ETH)
 */

import { JsonRpcProvider, formatEther } from 'ethers';

const NETWORKS = [
  { name: 'Base', rpc: 'https://mainnet.base.org', emoji: '🔵' },
  { name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', emoji: '🔷' },
  { name: 'Ethereum', rpc: 'https://eth.llamarpc.com', emoji: '⟠' }
];

const args = process.argv.slice(2);
const address = args.find(a => a.startsWith('0x'));
const watchMode = args.includes('--watch') || args.includes('-w');
const webhookUrl = args.find((a, i) => args[i-1] === '--webhook');
const interval = parseInt(args.find((a, i) => args[i-1] === '--interval') || '30') * 1000;

if (!address) {
  console.log(`
🔔 Wallet Watcher v1.0

Usage:
  node watch.mjs <address> [options]

Options:
  --watch, -w        Continuous monitoring mode
  --webhook <url>    Send notifications to webhook
  --interval <sec>   Polling interval (default: 30)

Examples:
  node watch.mjs 0x123...abc
  node watch.mjs 0x123...abc --watch
  node watch.mjs 0x123...abc --watch --webhook https://discord.com/api/webhooks/...

Built by Джахангир 🤖
Tip: 0x4bC44A054965636001111806BE44358fe4cf112d
`);
  process.exit(0);
}

let previousBalances = {};

async function getBalances(addr) {
  const balances = {};
  for (const net of NETWORKS) {
    try {
      const provider = new JsonRpcProvider(net.rpc);
      const balance = await provider.getBalance(addr);
      balances[net.name] = {
        wei: balance,
        eth: formatEther(balance),
        emoji: net.emoji
      };
    } catch (e) {
      balances[net.name] = { wei: 0n, eth: '0.0', emoji: net.emoji, error: e.message };
    }
  }
  return balances;
}

async function sendWebhook(message) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
  } catch (e) {
    console.error('Webhook failed:', e.message);
  }
}

function formatTime() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function check() {
  const balances = await getBalances(address);
  const time = formatTime();
  
  console.log(`\n[${time}]`);
  
  let changes = [];
  
  for (const [name, data] of Object.entries(balances)) {
    const prev = previousBalances[name];
    let line = `  ${data.emoji} ${name.padEnd(10)}: ${data.eth} ETH`;
    
    if (prev && data.wei > prev.wei) {
      const diff = formatEther(data.wei - prev.wei);
      line += ` (+${diff}) 🎉`;
      changes.push(`${name}: +${diff} ETH`);
    } else if (prev && data.wei < prev.wei) {
      const diff = formatEther(prev.wei - data.wei);
      line += ` (-${diff})`;
    }
    
    if (data.error) line += ` ⚠️`;
    console.log(line);
  }
  
  if (changes.length > 0) {
    const msg = `🎉 Incoming funds detected!\n${changes.join('\n')}\nWallet: ${address}`;
    await sendWebhook(msg);
  }
  
  previousBalances = balances;
}

async function main() {
  console.log(`
🔔 Wallet Watcher v1.0

Watching: ${address}
Mode: ${watchMode ? 'Continuous' : 'Single check'}
${webhookUrl ? `Webhook: ${webhookUrl.slice(0, 30)}...` : ''}
`);

  await check();
  
  if (watchMode) {
    console.log(`\nPolling every ${interval/1000}s... (Ctrl+C to stop)`);
    setInterval(check, interval);
  }
}

main().catch(console.error);
