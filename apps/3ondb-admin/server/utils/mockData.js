/**
 * Mock data for 3ON systems
 */

const SystemCategory = {
  CORE_INFRASTRUCTURE: 'core_infrastructure',
  BLOCKCHAIN_FINANCIAL: 'blockchain_financial',
  AI_CONSCIOUS: 'ai_conscious',
  IDENTITY_ACCESS: 'identity_access',
  COMMUNICATION_SOCIAL: 'communication_social',
  GLOBAL_METAVERSE: 'global_metaverse'
};

const systems = [
  // Core & Infrastructure
  { systemId: '3ON-CORE-0001', systemName: '3ONCORE', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'Core system', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-PRIME-0002', systemName: '3ONPRIME', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'Prime infrastructure', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-VPS-0003', systemName: '3ONVPS', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'VPS management', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-CLOUD-0004', systemName: '3ONCLOUD', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'Cloud platform', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-HOST-0005', systemName: '3ONHOST', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'Hosting services', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-OS-0006', systemName: '3ONOS', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'Operating system', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-WEB-0007', systemName: '3ONWEB', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'Web services', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-BASE-0008', systemName: '3ONBASE', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'Base protocols', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-PORT-0009', systemName: '3ONPORT', category: SystemCategory.CORE_INFRASTRUCTURE, description: 'Port management', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },

  // Blockchain & Financial
  { systemId: '3ON-CHAIN-1001', systemName: '3ONCHAIN', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Blockchain', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-PAY-1002', systemName: '3ONPAY', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Payment processing', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-BANK-1003', systemName: '3ONBANK', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Banking services', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-CASH-1004', systemName: '3ONCASH', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Digital cash', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-EX-1005', systemName: '3ONEX', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Exchange platform', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-MINT-1006', systemName: '3ONMINT', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Token minting', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-SWAP-1007', systemName: '3ONSWAP', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'DEX', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-WALLET-1008', systemName: '3ONWALLET', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Wallet', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-CARD-1009', systemName: '3ONCARD', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Card management', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-AIR-1010', systemName: '3ONAIR', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'Airdrop', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-GOMATM-1011', systemName: 'GOMATM', category: SystemCategory.BLOCKCHAIN_FINANCIAL, description: 'ATM network', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },

  // AI & Conscious
  { systemId: '3ON-MATRIX-2001', systemName: '3ONMATRIX', category: SystemCategory.AI_CONSCIOUS, description: 'AI matrix', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-MIND-2002', systemName: '3ONMIND', category: SystemCategory.AI_CONSCIOUS, description: 'Conscious AI', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-DREAM-2003', systemName: '3ONDREAM', category: SystemCategory.AI_CONSCIOUS, description: 'Dream engine', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-TRUTH-2004', systemName: '3ONTRUTH', category: SystemCategory.AI_CONSCIOUS, description: 'Truth verification', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-LAW-2005', systemName: '3ONLAW', category: SystemCategory.AI_CONSCIOUS, description: 'Legal framework', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-MIRROR-2006', systemName: '3ONMIRROR', category: SystemCategory.AI_CONSCIOUS, description: 'Reality reflection', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },

  // Identity & Access
  { systemId: '3ON-KEY-3001', systemName: '3ONKEY', category: SystemCategory.IDENTITY_ACCESS, description: 'Key management', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-PASS-3002', systemName: '3ONPASS', category: SystemCategory.IDENTITY_ACCESS, description: 'Password manager', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-ID-3003', systemName: '3ONID', category: SystemCategory.IDENTITY_ACCESS, description: 'Identity', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-ACCESS-3004', systemName: '3ONACCESS', category: SystemCategory.IDENTITY_ACCESS, description: 'Access control', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-QR-3005', systemName: '3ONQR', category: SystemCategory.IDENTITY_ACCESS, description: 'QR authentication', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-AUTHOLIUM-3006', systemName: 'AUTHOLIUM', category: SystemCategory.IDENTITY_ACCESS, description: 'Auth platform', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },

  // Communication & Social
  { systemId: '3ON-CHAT-4001', systemName: '3ONCHAT', category: SystemCategory.COMMUNICATION_SOCIAL, description: 'Chat', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-MAIL-4002', systemName: '3ONMAIL', category: SystemCategory.COMMUNICATION_SOCIAL, description: 'Email', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-VERSE-4003', systemName: '3ONVERSE', category: SystemCategory.COMMUNICATION_SOCIAL, description: 'Social network', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-PREEIIPREEII-4004', systemName: 'PREEIIPREEII', category: SystemCategory.COMMUNICATION_SOCIAL, description: 'Universal translator', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-VOICE-4005', systemName: '3ONVOICE', category: SystemCategory.COMMUNICATION_SOCIAL, description: 'Voice communication', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-CALL-4006', systemName: '3ONCALL', category: SystemCategory.COMMUNICATION_SOCIAL, description: 'Video calls', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },

  // Global & Metaverse
  { systemId: '3ON-CITY-5001', systemName: '3ONCITY', category: SystemCategory.GLOBAL_METAVERSE, description: 'City builder', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-WORLD-5002', systemName: '3ONWORLD', category: SystemCategory.GLOBAL_METAVERSE, description: 'Metaverse', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-ENERGY-5003', systemName: '3ONENERGY', category: SystemCategory.GLOBAL_METAVERSE, description: 'Energy management', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-LIGHT-5004', systemName: '3ONLIGHT', category: SystemCategory.GLOBAL_METAVERSE, description: 'Illumination', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 },
  { systemId: '3ON-NET-5005', systemName: '3ONNET', category: SystemCategory.GLOBAL_METAVERSE, description: 'Network', version: '1.0.0', status: 'active', lastHeartbeat: Date.now(), uptime: 86400 }
];

module.exports = {
  systems,
  SystemCategory
};
