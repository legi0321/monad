
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import readline from 'readline/promises';
import { setTimeout as wait } from 'timers/promises';

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const privateKeys = process.env.PRIVATE_KEYS.split(',').map(k => k.trim());
const wallets = privateKeys.map(k => new ethers.Wallet(k, provider));

// Router DEX
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

// Token pairs
const tokenPairs = [
  {
    tokenIn: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea',
    tokenOut: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'
  },
  {
    tokenIn: '0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37',
    tokenOut: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'
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

async function swapOnWithWallet(platform, tokenIn, tokenOut, amountIn, wallet) {
  const { address: routerAddr, name } = routers[platform];
  const router = new ethers.Contract(routerAddr, routerAbi, wallet);
  const token = new ethers.Contract(tokenIn, erc20Abi, wallet);

  const balance = await token.balanceOf(wallet.address);
  if (balance < amountIn) {
    console.log(`❌ [${wallet.address}] Saldo tidak cukup (${ethers.formatUnits(balance, 18)} < ${ethers.formatUnits(amountIn, 18)})`);
    return;
  }

  await token.approve(routerAddr, amountIn);
  console.log(`✅ [${name}] Approved ${ethers.formatUnits(amountIn, 18)} tokens`);

  const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
  const amountOutMin = (amounts[1] * 95n) / 100n;

  const tx = await router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    [tokenIn, tokenOut],
    wallet.address,
    Math.floor(Date.now() / 1000) + 600
  );

  console.log(`🔁 [${name}] Swap TX: ${tx.hash}`);
  await tx.wait();
  console.log(`🎉 [${name}] Swap sukses untuk ${wallet.address}`);
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const amountStr = await rl.question('Masukkan jumlah token yang ingin di-swap per transaksi: ');
  const repeatStr = await rl.question('Berapa kali ingin melakukan swap per wallet?: ');
  rl.close();

  // Validasi input
  if (!/^\d+(\.\d+)?$/.test(amountStr) || !/^\d+$/.test(repeatStr)) {
    console.error('❌ Input tidak valid. Pastikan kamu hanya mengetik angka (desimal/integer).');
    process.exit(1);
  }

  const amount = ethers.parseUnits(amountStr, 18);
  const repeat = parseInt(repeatStr);
  let errorCount = 0;

  for (const wallet of wallets) {
    console.log(`\n🔑 Wallet: ${wallet.address}`);
    for (let i = 0; i < repeat; i++) {
      console.log(`🔄 Iterasi ke-${i + 1}`);
      for (const pair of tokenPairs) {
        for (const platform of Object.keys(routers)) {
          try {
            await swapOnWithWallet(platform, pair.tokenIn, pair.tokenOut, amount, wallet);
            await wait(2500); // Delay antar transaksi 2.5 detik
          } catch (err) {
            console.error(`🚨 Swap gagal: ${err.message}`);
            errorCount++;
            if (errorCount >= 5) {
              console.error('🛑 Terlalu banyak error. Proses dihentikan.');
              return;
            }
          }
        }
      }
    }
  }
}

main().catch(console.error);
