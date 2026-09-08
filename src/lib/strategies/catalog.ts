import { StrategyDef } from "../types";

const wd = (
  n: number,
  key: string,
  name: string,
  description: string,
  params: StrategyDef["params"]
): StrategyDef => ({
  id: `wd_${String(n).padStart(2, "0")}_${key}`,
  name,
  family: "wallet_discovery",
  description,
  params,
});

const prop = (
  n: number,
  key: string,
  name: string,
  description: string,
  params: StrategyDef["params"]
): StrategyDef => ({
  id: `prop_${String(n).padStart(2, "0")}_${key}`,
  name,
  family: "proprietary",
  description,
  params,
});

export const WALLET_STRATEGIES: StrategyDef[] = [
  wd(1, "month_pnl", "Follow pleaseplease123 +2", "Replaced red board/clone with fixed good wallets: pleaseplease123, sainttroplay, Flaznorp", {
    mode: "fixed_wallets",
    wallets: "0x5e9458202b5817a72cf81105ec8a30e6f3705ba1,0x9319a045cdd0c2180e5eb7ad44374383db9a6410,0x821dab0565ebf5b327f51db06223fdcfe01acf16",
  }),
  wd(2, "week_pnl", "Follow Flaznorp +2", "Replaced red board/clone with fixed good wallets: Flaznorp, balthazar, 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140", {
    mode: "fixed_wallets",
    wallets: "0x821dab0565ebf5b327f51db06223fdcfe01acf16,0x5a218c7ad04135830a45c41aaed7294df7809318,0xd570e634aeb745d6501566dba5f81a555cc7e4f8",
  }),
  wd(3, "day_pnl", "Follow 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140 +2", "Replaced red board/clone with fixed good wallets: 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140, Talvez10, ferrariChampions2026", {
    mode: "fixed_wallets",
    wallets: "0xd570e634aeb745d6501566dba5f81a555cc7e4f8,0xa71093cafc0c099b4ccab24c3cb8018d817923c4,0xfe787d2da716d60e8acff57fb87eb13cd4d10319",
  }),
  wd(4, "all_pnl", "All-time PnL Leaders", "Follow all-time PnL leaders.", { window: "ALL", orderBy: "PNL", topN: 5 }),
  wd(5, "month_vol", "Month Volume Leaders", "Follow highest monthly volume.", { window: "MONTH", orderBy: "VOL", topN: 5 }),
  wd(26, "copy_please", "Copy pleaseplease123", "Mirror month #1 sports whale (MLB O/U, huge size, repeats).", {
    mode: "fixed_wallets",
    wallets: "0x5e9458202b5817a72cf81105ec8a30e6f3705ba1",
  }),
  wd(28, "copy_flaznorp", "Copy Flaznorp", "Mirror soccer/tennis stacker (month #4, week top-20).", {
    mode: "fixed_wallets",
    wallets: "0x821dab0565ebf5b327f51db06223fdcfe01acf16",
  }),
  wd(32, "consensus", "Cluster Consensus", "≥2 watched wallets same tape.", { window: "MONTH", mode: "consensus", topN: 8 }),
  wd(34, "sports", "Sports-title Follow", "Leaders on sports-like titles.", { window: "MONTH", categoryHint: "sports", topN: 5 }),
  wd(37, "quintiles", "Diversified 5", "One wallet per quintile.", { window: "MONTH", mode: "quintiles", topN: 5 }),
  wd(43, "copy_e46m3", "Copy e46m3", "Mirror politics-favorites buyer (consistent month+week).", {
    mode: "fixed_wallets",
    wallets: "0x4f1d5ae26fc31472966e951af3183308736d8de2",
  }),
  wd(49, "copy_totoro", "Copy totoro3miyazaki", "Mirror soccer match-winner whale (month #8).", {
    mode: "fixed_wallets",
    wallets: "0x0f6f76ced62a911bccef92f50faaff143854d977",
  }),
];

export const PROP_STRATEGIES: StrategyDef[] = [];
export const ALL_STRATEGIES: StrategyDef[] = [...WALLET_STRATEGIES, ...PROP_STRATEGIES];
export function getStrategy(id: string) {
  return ALL_STRATEGIES.find((s) => s.id === id);
}
