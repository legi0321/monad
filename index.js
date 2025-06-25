// swap_all.js (multi-akun + multi-token-pair)
require('dotenv').config();
const { ethers } = require('ethers');
const readline = require('readline');

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const keys = process.env.PRIVATE_KEYS.split(',');
const wallets = keys.map(k => new ethers.Wallet(k.trim(), provider));

// Tambahkan alamat router di sini
const routers = {
  bean: {
    address: '0xca810d095e90daae6e867c19df6d9a8c56db2c89',
    name: 'Bean Exchange'
  },
  kuru: {
    address: '0xc816865f172d640d93712C68a7E1F83F3fA63235',
    name: 'Kuru.io'
  },
  izumi: {
    address: '0xf6ffe4f3fdc8bbb7f70ffd48e61f17d1e343ddfd',
    name: 'Izumi Finance'
  }
};

// Daftar pasangan token yang ingin ditukar
const tokenPairs = [
  {
    tokenIn: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea',   // Ganti dengan token input pertama
    tokenOut: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'  // Ganti dengan token output pertama
  },
  {
    tokenIn: '0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37',   // Ganti dengan token input kedua
    tokenOut: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'  // Ganti dengan token output kedua
  }
  {
    tokenIn: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701',   // Ganti dengan token input kedua
    tokenOut: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea'  // Ganti dengan token output kedua
  }
  
];

const routerAbi = [
  'function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
  'function getAmountsOut(uint256,address[]) view returns (uint256[])'
];
const erc20Abi = ['function approve(address,uint256) public returns (bool)'];

async function swapOnWithWallet(platform, tokenIn, tokenOut, amountIn, wallet) {
  const { address: routerAddr, name } = routers[platform];
  if (!routerAddr.startsWith('0x') || routerAddr.includes('ADDRESS_HERE')) {
    console.log(`⚠️ Router ${name} belum dikonfigurasi.`);
    return;
  }
  const router = new ethers.Contract(routerAddr, routerAbi, wallet);
  const token = new ethers.Contract(tokenIn, erc20Abi, wallet);

  await token.approve(routerAddr, amountIn);
  console.log(`✅ [${name}] Approved ${ethers.utils.formatUnits(amountIn)} tokens on ${wallet.address}`);

  const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
  const amountOutMin = amounts[1].mul(95).div(100);

  const tx = await router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    [tokenIn, tokenOut],
    wallet.address,
    Math.floor(Date.now() / 1000) + 60 * 10
  );
  console.log(`🔁 [${name}] Tx: ${tx.hash}`);
  await tx.wait();
  console.log(`🎉 [${name}] Swap successful for ${wallet.address}`);
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  const amountStr = await prompt('Masukkan jumlah token yang ingin di-swap per transaksi: ');
  const repeatStr = await prompt('Berapa kali ingin melakukan swap per wallet?: ');

  const amount = ethers.utils.parseUnits(amountStr, 18);
  const repeat = parseInt(repeatStr);

  for (const wallet of wallets) {
    console.log(`\n🔑 Menggunakan wallet: ${wallet.address}`);
    for (let i = 0; i < repeat; i++) {
      console.log(`🔄 Iterasi ke-${i + 1}`);
      for (const pair of tokenPairs) {
        for (const platform of Object.keys(routers)) {
          await swapOnWithWallet(platform, pair.tokenIn, pair.tokenOut, amount, wallet);
        }
      }
    }
  }
}

main().catch(console.error);
