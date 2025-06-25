// index.js
import 'dotenv/config';
import { ethers } from 'ethers';
import readline from 'readline/promises';
import { setTimeout as delay } from 'timers/promises';

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallets = process.env.PRIVATE_KEYS.split(',').map(pk => new ethers.Wallet(pk.trim(), provider));

// Daftar router DEX
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

async function swap(platform, tokenIn, tokenOut, amountIn, wallet) {
  try {
    const { address: routerAddr, name } = routers[platform];
    const token = new ethers.Contract(tokenIn, erc20Abi, wallet);
    const router = new ethers.Contract(routerAddr, routerAbi, wallet);

    const balance = await token.balanceOf(wallet.address);
    if (balance < amountIn) {
      console.log(`❌ [${wallet.address}] Saldo kurang. Punya: ${ethers.formatUnits(balance, 18)}`);
      return;
    }

    await token.approve(routerAddr, amountIn);
    console.log(`✅ [${name}] Approve ${ethers.formatUnits(amountIn, 18)} token`);

    const [_, amountOut] = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    const amountOutMin = amountOut * 0.95n / 1n;

    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      [tokenIn, tokenOut],
      wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 5
    );

    console.log(`🔁 [${name}] Tx sent: ${tx.hash}`);
    await tx.wait();
    console.log(`🎉 [${name}] Swap sukses\n`);
  } catch (err) {
    console.log(`🚨 Swap gagal: ${err.reason || err.message || 'Unknown error'}`);
  }
}

async function swap(platform, tokenIn, tokenOut, amountIn, wallet) {
  try {
    const { address: routerAddr, name } = routers[platform];
    const token = new ethers.Contract(tokenIn, erc20Abi, wallet);
    const router = new ethers.Contract(routerAddr, routerAbi, wallet);

    const balance = await token.balanceOf(wallet.address);
    if (balance < amountIn) {
      console.log(`❌ [${wallet.address}] Saldo kurang. Punya: ${ethers.formatUnits(balance, 18)}`);
      return;
    }

    await token.approve(routerAddr, amountIn);
    console.log(`✅ [${name}] Approve ${ethers.formatUnits(amountIn, 18)} token`);

    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    const amountOutMin = amounts[1] * 95n / 100n;

    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      [tokenIn, tokenOut],
      wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 5
    );

    console.log(`🔁 [${name}] Tx sent: ${tx.hash}`);
    await tx.wait();
    console.log(`🎉 [${name}] Swap sukses\n`);
  } catch (err) {
    console.log(`🚨 Swap gagal: ${err.reason || err.message || 'Unknown error'}`);
  }
}

