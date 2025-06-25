// index.js (versi stabil dengan pengecekan saldo, delay, validasi, anti-spam)
require('dotenv').config();
const { ethers } = require('ethers');
const readline = require('readline');

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const keys = process.env.PRIVATE_KEYS.split(',');
const wallets = keys.map(k => new ethers.Wallet(k.trim(), provider));

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

const tokenPairs = [
  {
    tokenIn: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea',
    tokenOut: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'
  },
  {
    tokenIn: '0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37',
    tokenOut: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'
  },
  {
    tokenIn: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701',
    tokenOut: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea'
  }
];

const routerAbi = [
  'function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
  'function getAmountsOut(uint256,address[]) view returns (uint256[])'
];
const erc20Abi = [
  'function approve(address,uint256) public returns (bool)',
  'function balanceOf(address) view returns (uint256)'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function swapOnWithWallet(platform, tokenIn, tokenOut, amountIn, wallet) {
  try {
    const { address: routerAddr, name } = routers[platform];
    const router = new ethers.Contract(routerAddr, routerAbi, wallet);
    const token = new ethers.Contract(tokenIn, erc20Abi, wallet);

    const balance = await token.balanceOf(wallet.address);
    if (balance.lt(amountIn)) {
      console.log(`❌ [${wallet.address}] Saldo tidak cukup (${ethers.formatUnits(balance, 18)} < ${ethers.formatUnits(amountIn, 18)})`);
      return;
    }

    await token.approve(routerAddr, amountIn);
    console.log(`✅ [${name}] Approved ${ethers.formatUnits(amountIn)} tokens on ${wallet.address}`);

    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    const amountOutMin = BigInt(amounts[1]) * 95n / 100n;

    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      [tokenIn, tokenOut],
      wallet.address,
      Math.floor(Date.now() / 1000) + 600
    );
    console.log(`🔁 [${name}] Tx sent: ${tx.hash}`);
    await tx.wait();
    console.log(`🎉 [${name}] Swap successful for ${wallet.address}`);
  } catch (error) {
    console.error(`🚨 Swap gagal:`, error.shortMessage || error.message);
  }
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

  if (!/^[0-9.]+$/.test(amountStr) || !/^[0-9]+$/.test(repeatStr)) {
    console.log('❌ Input tidak valid. Gunakan angka desimal (0.1) dan integer (1, 2, dst).');
    return;
  }

  const amount = ethers.parseUnits(amountStr, 18);
  const repeat = parseInt(repeatStr);

  for (const wallet of wallets) {
    console.log(`\n🔑 Wallet: ${wallet.address}`);
    for (let i = 0; i < repeat; i++) {
      console.log(`🔄 Iterasi ke-${i + 1}`);
      for (const pair of tokenPairs) {
        for (const platform of Object.keys(routers)) {
          await swapOnWithWallet(platform, pair.tokenIn, pair.tokenOut, amount, wallet);
          await sleep(2500); // delay 2.5 detik antara swap
        }
      }
    }
  }
}

main().catch(console.error);
