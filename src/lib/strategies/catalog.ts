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
  wd(6, "week_vol", "Follow ferrariChampions2026 +2", "Replaced red board/clone with fixed good wallets: ferrariChampions2026, BillyGating, 11vsldfdsgfkjgos", {
    mode: "fixed_wallets",
    wallets: "0xfe787d2da716d60e8acff57fb87eb13cd4d10319,0x2dfa4e79eca44b7c774f40a45535adbc368a6f60,0x397062018dfb77e855608fe23223592bc82c44ce",
  }),
  wd(7, "pnl_eff", "Follow 11vsldfdsgfkjgos +2", "Replaced red board/clone with fixed good wallets: 11vsldfdsgfkjgos, 0x2c335066FE58fe9237c3d3Dc7b275C2a034a0563-1759935795465, WTSA", {
    mode: "fixed_wallets",
    wallets: "0x397062018dfb77e855608fe23223592bc82c44ce,0x2c335066fe58fe9237c3d3dc7b275c2a034a0563,0x04d5524a0a5af2eca6e39e03defc261d42fe66d8",
  }),
  wd(8, "multi_window", "Follow WTSA +2", "Replaced red board/clone with fixed good wallets: WTSA, Jsram, 0xd3A0b4E941B557D33A8EFd5a51c581e7c79cF136-1787996319116", {
    mode: "fixed_wallets",
    wallets: "0x04d5524a0a5af2eca6e39e03defc261d42fe66d8,0x83720820a8aa6c3f20ad71850e7a1a17d16c5223,0xd3a0b4e941b557d33a8efd5a51c581e7c79cf136",
  }),
  wd(9, "triple", "Follow 0xd3A0b4E941B557D33A8EFd5a51c581e7c79cF136-1787996319116 +2", "Replaced red board/clone with fixed good wallets: 0xd3A0b4E941B557D33A8EFd5a51c581e7c79cF136-1787996319116, gambamaster, matanovik", {
    mode: "fixed_wallets",
    wallets: "0xd3a0b4e941b557d33a8efd5a51c581e7c79cf136,0x9ee8bbc36d378af72e5f6b8e2ea2eb67c05a89de,0x39d3c773be30fcc73161fc6768f46d563a779ef0",
  }),
  wd(10, "mid_tier", "Follow matanovik +2", "Replaced red board/clone with fixed good wallets: matanovik, ExplosiveNinja, e46m3", {
    mode: "fixed_wallets",
    wallets: "0x39d3c773be30fcc73161fc6768f46d563a779ef0,0x73e3fec494611d73c170cb2f23850fd998b21be9,0x4f1d5ae26fc31472966e951af3183308736d8de2",
  }),
  wd(11, "small_book", "Follow e46m3 +2", "Replaced red board/clone with fixed good wallets: e46m3, midturn, 0x29b52d98ac9ef9414b04164246c95BC63d7", {
    mode: "fixed_wallets",
    wallets: "0x4f1d5ae26fc31472966e951af3183308736d8de2,0xb0c85813a7a4428f1139ff91d3118a92c391fe7f,0x29b52d98ac9ef9414b04164246c95bc63d74cc6c",
  }),
  wd(12, "large_book", "Follow 0x29b52d98ac9ef9414b04164246c95BC63d7 +2", "Replaced red board/clone with fixed good wallets: 0x29b52d98ac9ef9414b04164246c95BC63d7, swisstony, Theo4", {
    mode: "fixed_wallets",
    wallets: "0x29b52d98ac9ef9414b04164246c95bc63d74cc6c,0x204f72f35326db932158cba6adff0b9a1da95e14,0x56687bf447db6ffa42ffe2204a05edaa20f55839",
  }),
  wd(13, "fade_day", "Follow Theo4 +2", "Replaced red board/clone with fixed good wallets: Theo4, Fredi9999, RN1", {
    mode: "fixed_wallets",
    wallets: "0x56687bf447db6ffa42ffe2204a05edaa20f55839,0x1f2dd6d473f3e824cd2f8a89d9c69fb96f6ad0cf,0x2005d16a84ceefa912d4e380cd32e7ff827875ea",
  }),
  wd(14, "stable_all", "Follow RN1 +2", "Replaced red board/clone with fixed good wallets: RN1, kch123, mintblade", {
    mode: "fixed_wallets",
    wallets: "0x2005d16a84ceefa912d4e380cd32e7ff827875ea,0x6a72f61820b26b1fe4d956e17b6dc2a1ea3033ee,0x96cfcb0c30942cfcd1cdf76c7d408794d66b1acb",
  }),
  wd(15, "breakout", "Follow mintblade +2", "Replaced red board/clone with fixed good wallets: mintblade, fishalive, frostrizz", {
    mode: "fixed_wallets",
    wallets: "0x96cfcb0c30942cfcd1cdf76c7d408794d66b1acb,0xed64a7bf029040aa331abc87902434d815ef217d,0xbc11a64ab34a03a043fbe80598fa065ee87eeec6",
  }),
  wd(16, "climbers", "Follow frostrizz +2", "Replaced red board/clone with fixed good wallets: frostrizz, Len9311238, sparklingwater123", {
    mode: "fixed_wallets",
    wallets: "0xbc11a64ab34a03a043fbe80598fa065ee87eeec6,0x78b9ac44a6d7d7a076c14e0ad518b301b63c6b76,0x664ce9fb97ae1bbd538d7381b2f4e92dab16f49c",
  }),
  wd(17, "vol_stable", "Follow sparklingwater123 +2", "Replaced red board/clone with fixed good wallets: sparklingwater123, DEEDDIT, zxgngl", {
    mode: "fixed_wallets",
    wallets: "0x664ce9fb97ae1bbd538d7381b2f4e92dab16f49c,0x09b428f7c2b469786286214aa5c90dd9015f7320,0xd235973291b2b75ff4070e9c0b01728c520b0f29",
  }),
  wd(18, "retail_tier", "Follow zxgngl +2", "Replaced red board/clone with fixed good wallets: zxgngl, GRIMDRIP, RepTrump", {
    mode: "fixed_wallets",
    wallets: "0xd235973291b2b75ff4070e9c0b01728c520b0f29,0x3f87d51f27ba6e19ec52aaeebb68559a839c742c,0x863134d00841b2e200492805a01e1e2f5defaa53",
  }),
  wd(19, "ex_ultravol", "Follow RepTrump +2", "Replaced red board/clone with fixed good wallets: RepTrump, endlessFate, PrincessCaro", {
    mode: "fixed_wallets",
    wallets: "0x863134d00841b2e200492805a01e1e2f5defaa53,0x5e4c3b5b81171e2ca4ab776ac0d6bba787f9dba2,0x8119010a6e589062aa03583bb3f39ca632d9f887",
  }),
  wd(20, "balanced", "Follow PrincessCaro +2", "Replaced red board/clone with fixed good wallets: PrincessCaro, walletmobile, KeyTransporter", {
    mode: "fixed_wallets",
    wallets: "0x8119010a6e589062aa03583bb3f39ca632d9f887,0xe9ad918c7678cd38b12603a762e638a5d1ee7091,0x94f199fb7789f1aef7fff6b758d6b375100f4c7a",
  }),
  wd(21, "week_special", "Follow KeyTransporter +2", "Replaced red board/clone with fixed good wallets: KeyTransporter, beachboy4, pleaseplease123", {
    mode: "fixed_wallets",
    wallets: "0x94f199fb7789f1aef7fff6b758d6b375100f4c7a,0xc2e7800b5af46e6093872b177b7a5e7f0563be51,0x5e9458202b5817a72cf81105ec8a30e6f3705ba1",
  }),
  wd(22, "persist", "Follow pleaseplease123 +2", "Replaced red board/clone with fixed good wallets: pleaseplease123, sainttroplay, Flaznorp", {
    mode: "fixed_wallets",
    wallets: "0x5e9458202b5817a72cf81105ec8a30e6f3705ba1,0x9319a045cdd0c2180e5eb7ad44374383db9a6410,0x821dab0565ebf5b327f51db06223fdcfe01acf16",
  }),
  wd(23, "risk_adj", "Follow Flaznorp +2", "Replaced red board/clone with fixed good wallets: Flaznorp, balthazar, 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140", {
    mode: "fixed_wallets",
    wallets: "0x821dab0565ebf5b327f51db06223fdcfe01acf16,0x5a218c7ad04135830a45c41aaed7294df7809318,0xd570e634aeb745d6501566dba5f81a555cc7e4f8",
  }),
  wd(24, "top1", "Follow 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140 +2", "Replaced red board/clone with fixed good wallets: 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140, Talvez10, ferrariChampions2026", {
    mode: "fixed_wallets",
    wallets: "0xd570e634aeb745d6501566dba5f81a555cc7e4f8,0xa71093cafc0c099b4ccab24c3cb8018d817923c4,0xfe787d2da716d60e8acff57fb87eb13cd4d10319",
  }),
  wd(25, "top3", "Follow ferrariChampions2026 +2", "Replaced red board/clone with fixed good wallets: ferrariChampions2026, BillyGating, 11vsldfdsgfkjgos", {
    mode: "fixed_wallets",
    wallets: "0xfe787d2da716d60e8acff57fb87eb13cd4d10319,0x2dfa4e79eca44b7c774f40a45535adbc368a6f60,0x397062018dfb77e855608fe23223592bc82c44ce",
  }),
  wd(26, "copy_please", "Copy pleaseplease123", "Mirror month #1 sports whale (MLB O/U, huge size, repeats).", {
    mode: "fixed_wallets",
    wallets: "0x5e9458202b5817a72cf81105ec8a30e6f3705ba1",
  }),
  wd(27, "anti_lb", "Follow 11vsldfdsgfkjgos +2", "Replaced red board/clone with fixed good wallets: 11vsldfdsgfkjgos, 0x2c335066FE58fe9237c3d3Dc7b275C2a034a0563-1759935795465, WTSA", {
    mode: "fixed_wallets",
    wallets: "0x397062018dfb77e855608fe23223592bc82c44ce,0x2c335066fe58fe9237c3d3dc7b275c2a034a0563,0x04d5524a0a5af2eca6e39e03defc261d42fe66d8",
  }),
  wd(28, "copy_flaznorp", "Copy Flaznorp", "Mirror soccer/tennis stacker (month #4, week top-20).", {
    mode: "fixed_wallets",
    wallets: "0x821dab0565ebf5b327f51db06223fdcfe01acf16",
  }),
  wd(29, "mid_conv", "Follow WTSA +2", "Replaced red board/clone with fixed good wallets: WTSA, Jsram, 0xd3A0b4E941B557D33A8EFd5a51c581e7c79cF136-1787996319116", {
    mode: "fixed_wallets",
    wallets: "0x04d5524a0a5af2eca6e39e03defc261d42fe66d8,0x83720820a8aa6c3f20ad71850e7a1a17d16c5223,0xd3a0b4e941b557d33a8efd5a51c581e7c79cf136",
  }),
  wd(30, "exits", "Follow 0xd3A0b4E941B557D33A8EFd5a51c581e7c79cF136-1787996319116 +2", "Replaced red board/clone with fixed good wallets: 0xd3A0b4E941B557D33A8EFd5a51c581e7c79cF136-1787996319116, gambamaster, matanovik", {
    mode: "fixed_wallets",
    wallets: "0xd3a0b4e941b557d33a8efd5a51c581e7c79cf136,0x9ee8bbc36d378af72e5f6b8e2ea2eb67c05a89de,0x39d3c773be30fcc73161fc6768f46d563a779ef0",
  }),
  wd(31, "entries", "Follow matanovik +2", "Replaced red board/clone with fixed good wallets: matanovik, ExplosiveNinja, e46m3", {
    mode: "fixed_wallets",
    wallets: "0x39d3c773be30fcc73161fc6768f46d563a779ef0,0x73e3fec494611d73c170cb2f23850fd998b21be9,0x4f1d5ae26fc31472966e951af3183308736d8de2",
  }),
  wd(32, "consensus", "Cluster Consensus", "≥2 watched wallets same tape.", { window: "MONTH", mode: "consensus", topN: 8 }),
  wd(33, "copy_breakbank", "Follow e46m3 +2", "Replaced red board/clone with fixed good wallets: e46m3, midturn, 0x29b52d98ac9ef9414b04164246c95BC63d7", {
    mode: "fixed_wallets",
    wallets: "0x4f1d5ae26fc31472966e951af3183308736d8de2,0xb0c85813a7a4428f1139ff91d3118a92c391fe7f,0x29b52d98ac9ef9414b04164246c95bc63d74cc6c",
  }),
  wd(34, "sports", "Sports-title Follow", "Leaders on sports-like titles.", { window: "MONTH", categoryHint: "sports", topN: 5 }),
  wd(35, "btc_ud_rep", "Follow 0x29b52d98ac9ef9414b04164246c95BC63d7 +2", "Replaced red board/clone with fixed good wallets: 0x29b52d98ac9ef9414b04164246c95BC63d7, swisstony, Theo4", {
    mode: "fixed_wallets",
    wallets: "0x29b52d98ac9ef9414b04164246c95bc63d74cc6c,0x204f72f35326db932158cba6adff0b9a1da95e14,0x56687bf447db6ffa42ffe2204a05edaa20f55839",
  }),
  wd(36, "politics", "Follow Theo4 +2", "Replaced red board/clone with fixed good wallets: Theo4, Fredi9999, RN1", {
    mode: "fixed_wallets",
    wallets: "0x56687bf447db6ffa42ffe2204a05edaa20f55839,0x1f2dd6d473f3e824cd2f8a89d9c69fb96f6ad0cf,0x2005d16a84ceefa912d4e380cd32e7ff827875ea",
  }),
  wd(37, "quintiles", "Diversified 5", "One wallet per quintile.", { window: "MONTH", mode: "quintiles", topN: 5 }),
  wd(38, "rot_week", "Follow RN1 +2", "Replaced red board/clone with fixed good wallets: RN1, kch123, mintblade", {
    mode: "fixed_wallets",
    wallets: "0x2005d16a84ceefa912d4e380cd32e7ff827875ea,0x6a72f61820b26b1fe4d956e17b6dc2a1ea3033ee,0x96cfcb0c30942cfcd1cdf76c7d408794d66b1acb",
  }),
  wd(39, "rot_day", "Follow mintblade +2", "Replaced red board/clone with fixed good wallets: mintblade, fishalive, frostrizz", {
    mode: "fixed_wallets",
    wallets: "0x96cfcb0c30942cfcd1cdf76c7d408794d66b1acb,0xed64a7bf029040aa331abc87902434d815ef217d,0xbc11a64ab34a03a043fbe80598fa065ee87eeec6",
  }),
  wd(40, "pnl_floor", "Follow frostrizz +2", "Replaced red board/clone with fixed good wallets: frostrizz, Len9311238, sparklingwater123", {
    mode: "fixed_wallets",
    wallets: "0xbc11a64ab34a03a043fbe80598fa065ee87eeec6,0x78b9ac44a6d7d7a076c14e0ad518b301b63c6b76,0x664ce9fb97ae1bbd538d7381b2f4e92dab16f49c",
  }),
  wd(41, "copy_colombo", "Follow sparklingwater123 +2", "Replaced red board/clone with fixed good wallets: sparklingwater123, DEEDDIT, zxgngl", {
    mode: "fixed_wallets",
    wallets: "0x664ce9fb97ae1bbd538d7381b2f4e92dab16f49c,0x09b428f7c2b469786286214aa5c90dd9015f7320,0xd235973291b2b75ff4070e9c0b01728c520b0f29",
  }),
  wd(42, "dual_top", "Follow zxgngl +2", "Replaced red board/clone with fixed good wallets: zxgngl, GRIMDRIP, RepTrump", {
    mode: "fixed_wallets",
    wallets: "0xd235973291b2b75ff4070e9c0b01728c520b0f29,0x3f87d51f27ba6e19ec52aaeebb68559a839c742c,0x863134d00841b2e200492805a01e1e2f5defaa53",
  }),
  wd(43, "copy_e46m3", "Copy e46m3", "Mirror politics-favorites buyer (consistent month+week).", {
    mode: "fixed_wallets",
    wallets: "0x4f1d5ae26fc31472966e951af3183308736d8de2",
  }),
  wd(44, "contrarian_day", "Follow RepTrump +2", "Replaced red board/clone with fixed good wallets: RepTrump, endlessFate, PrincessCaro", {
    mode: "fixed_wallets",
    wallets: "0x863134d00841b2e200492805a01e1e2f5defaa53,0x5e4c3b5b81171e2ca4ab776ac0d6bba787f9dba2,0x8119010a6e589062aa03583bb3f39ca632d9f887",
  }),
  wd(45, "mom_stack", "Follow PrincessCaro +2", "Replaced red board/clone with fixed good wallets: PrincessCaro, walletmobile, KeyTransporter", {
    mode: "fixed_wallets",
    wallets: "0x8119010a6e589062aa03583bb3f39ca632d9f887,0xe9ad918c7678cd38b12603a762e638a5d1ee7091,0x94f199fb7789f1aef7fff6b758d6b375100f4c7a",
  }),
  wd(46, "mr_stack", "Follow KeyTransporter +2", "Replaced red board/clone with fixed good wallets: KeyTransporter, beachboy4, pleaseplease123", {
    mode: "fixed_wallets",
    wallets: "0x94f199fb7789f1aef7fff6b758d6b375100f4c7a,0xc2e7800b5af46e6093872b177b7a5e7f0563be51,0x5e9458202b5817a72cf81105ec8a30e6f3705ba1",
  }),
  wd(47, "copy_balthazar", "Follow pleaseplease123 +2", "Replaced red board/clone with fixed good wallets: pleaseplease123, sainttroplay, Flaznorp", {
    mode: "fixed_wallets",
    wallets: "0x5e9458202b5817a72cf81105ec8a30e6f3705ba1,0x9319a045cdd0c2180e5eb7ad44374383db9a6410,0x821dab0565ebf5b327f51db06223fdcfe01acf16",
  }),
  wd(48, "copy_esports", "Follow Flaznorp +2", "Replaced red board/clone with fixed good wallets: Flaznorp, balthazar, 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140", {
    mode: "fixed_wallets",
    wallets: "0x821dab0565ebf5b327f51db06223fdcfe01acf16,0x5a218c7ad04135830a45c41aaed7294df7809318,0xd570e634aeb745d6501566dba5f81a555cc7e4f8",
  }),
  wd(49, "copy_totoro", "Copy totoro3miyazaki", "Mirror soccer match-winner whale (month #8).", {
    mode: "fixed_wallets",
    wallets: "0x0f6f76ced62a911bccef92f50faaff143854d977",
  }),
  wd(50, "hybrid", "Follow 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140 +2", "Replaced red board/clone with fixed good wallets: 0xd9670ea74384c1e1b9dc1e4267ffadaf4cdd140, Talvez10, ferrariChampions2026", {
    mode: "fixed_wallets",
    wallets: "0xd570e634aeb745d6501566dba5f81a555cc7e4f8,0xa71093cafc0c099b4ccab24c3cb8018d817923c4,0xfe787d2da716d60e8acff57fb87eb13cd4d10319",
  }),
];

export const PROP_STRATEGIES: StrategyDef[] = [
  prop(1, "fade_longshots", "Fade Longshots", "Fade YES buys priced as longshots.", { mode: "fade_longshot", longshot: 0.15 }),
  prop(2, "buy_favorites", "Buy Favorites", "Buy when price > 0.75.", { mode: "buy_favorite", favorite: 0.75 }),
  prop(3, "fade_ls_flip", "Longshot Flip", "Flip side on longshot prints.", { mode: "fade_longshot_flip", longshot: 0.12 }),
  prop(4, "mid_value", "Mid-price Value", "Only 0.40–0.60.", { mode: "mid_band", lo: 0.4, hi: 0.6 }),
  prop(5, "avoid_certain", "Avoid Near-Certain", "Skip extremes.", { mode: "skip_extreme", lo: 0.08, hi: 0.92 }),
  prop(6, "tape_mom", "Tape Momentum", "Follow buy tape.", { mode: "tape_momentum" }),
  prop(7, "tape_fade", "Tape Exhaustion Fade", "Fade tape bursts.", { mode: "tape_fade" }),
  prop(8, "size_follow", "Size Spike Follow", "Follow large size.", { mode: "size_spike", minSize: 500 }),
  prop(9, "size_fade", "Size Spike Fade", "Fade large size.", { mode: "size_spike_fade", minSize: 500 }),
  prop(10, "crypto_fade", "Crypto Up/Down Fade", "Fade short-horizon crypto.", { mode: "crypto_updown_fade" }),
  prop(11, "crypto_follow", "Crypto Up/Down Follow", "Follow crypto shorts.", { mode: "crypto_updown_follow" }),
  prop(12, "sports_buy", "Sports Buy Flow", "Sports buys.", { mode: "category_follow", categoryHint: "sports", side: "BUY" }),
  prop(13, "politics_buy", "Politics Buy Flow", "Politics buys.", { mode: "category_follow", categoryHint: "politics", side: "BUY" }),
  prop(14, "newsy", "Newsy Keywords", "Election/fed/war keywords.", { mode: "keyword_tape" }),
  prop(15, "stale_mid", "Stale Mid", "Buy mid after quiet.", { mode: "mid_band", lo: 0.45, hi: 0.55 }),
  prop(16, "round_fade", "Round Number Fade", "Fade 0.50/0.75 magnets.", { mode: "round_fade" }),
  prop(17, "break_50", "Break 50 Momentum", "Follow crosses near 0.50.", { mode: "break_50" }),
  prop(18, "mr_10c", "10¢ Mean Revert", "Fade 10¢ jumps.", { mode: "mean_revert", jump: 0.1 }),
  prop(19, "mom_10c", "10¢ Momentum", "Follow 10¢ jumps.", { mode: "momentum_jump", jump: 0.1 }),
  prop(20, "thin_skip", "Min Size Filter", "Only size≥50.", { mode: "min_size", minSize: 50 }),
  prop(21, "micro", "Micro Scalp Band", "0.48–0.52 buys.", { mode: "micro_band", lo: 0.48, hi: 0.52 }),
  prop(22, "end_fav", "Endgame Favorite", "Buy >0.85.", { mode: "endgame_favorite", favorite: 0.85 }),
  prop(23, "end_fade", "Endgame Overpay Fade", "Fade 0.90–0.97 tiny size.", { mode: "endgame_fade" }),
  prop(24, "sell_str", "Sell Strength", "Sell into buys >0.70.", { mode: "sell_strength", thr: 0.7 }),
  prop(25, "buy_weak", "Buy Weakness", "Buy ≤0.30.", { mode: "buy_weakness", thr: 0.3 }),
  prop(26, "inv_bal", "Inventory Balance", "Flatten skew.", { mode: "inventory_balance" }),
  prop(27, "single", "Single Position Focus", "Max one market.", { mode: "single_focus" }),
  prop(28, "max3", "Max Three Books", "Cap 3 markets.", { mode: "max_books", maxBooks: 3 }),
  prop(29, "fresh_tape", "Rotate Fresh Tape", "Newest eligible trade.", { mode: "newest_trade" }),
  prop(30, "ignore_crypto", "Ignore Crypto Shorts", "Skip up/down crypto.", { mode: "ignore_crypto" }),
  prop(31, "only_crypto", "Only Crypto Shorts", "Only crypto shorts.", { mode: "only_crypto" }),
  prop(32, "anchor", "Anchor 40–60", "Trade mid band.", { mode: "mid_band", lo: 0.4, hi: 0.6 }),
  prop(33, "batch_maj", "High Activity Follow", "Batch majority side.", { mode: "batch_majority" }),
  prop(34, "batch_min", "Contrarian Batch", "Batch minority side.", { mode: "batch_minority" }),
  prop(35, "whale2k", "Whale ≥$2k", "Mirror size≥2000.", { mode: "min_size_follow", minSize: 2000 }),
  prop(36, "retail25", "Retail ≤$25", "Only tiny prints.", { mode: "max_size", maxSize: 25 }),
  prop(37, "yes_bias", "YES Outcome Bias", "Prefer Yes/Up.", { mode: "outcome_bias", prefer: "yes" }),
  prop(38, "no_bias", "NO Outcome Bias", "Prefer No/Down.", { mode: "outcome_bias", prefer: "no" }),
  prop(39, "tp", "Take Profit Proxy", "Trim +20% winners.", { mode: "take_profit", tp: 0.2 }),
  prop(40, "sl", "Stop Loss Proxy", "Cut −20% losers.", { mode: "stop_loss", sl: 0.2 }),
  prop(41, "hold_win", "Hold Winners", "Only add, rarely sell winners.", { mode: "hold_winners" }),
  prop(42, "first_print", "Opening Drive", "First print follow.", { mode: "first_print_follow" }),
  prop(43, "last_print", "Closing Drive", "Last print follow.", { mode: "last_print_follow" }),
  prop(44, "range_follow", "Vol Expand Follow", "Wide range → follow.", { mode: "range_follow" }),
  prop(45, "range_fade", "Vol Contract Fade", "Tight range → fade.", { mode: "range_fade" }),
  prop(46, "ctrl_rand", "Random Control", "Random eligible tape.", { mode: "random" }),
  prop(47, "ctrl_buy", "Always Buy Control", "Buy eligible prints.", { mode: "always_buy" }),
  prop(48, "ctrl_sell", "Always Sell Control", "Sell when possible.", { mode: "always_sell" }),
  prop(49, "favorite_longshot", "Classic FLB", "Buy favorites & fade longshots combo filter.", { mode: "buy_favorite", favorite: 0.8 }),
  prop(50, "sum_proxy", "Certainty Avoidance", "Avoid >0.95 grinders.", { mode: "skip_extreme", lo: 0.05, hi: 0.95 }),
];

export const ALL_STRATEGIES: StrategyDef[] = [
  ...WALLET_STRATEGIES,
  ...PROP_STRATEGIES,
];

export function getStrategy(id: string) {
  return ALL_STRATEGIES.find((s) => s.id === id);
}
