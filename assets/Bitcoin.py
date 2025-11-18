def calc_avg_price(trades):
    """
    trades: list of dict
    [
        {"price": 92100, "amount": 1000000},
        {"price": 92300, "amount": 800000}
    ]
    """
    total_cost = sum(t["price"] * (t["amount"] / t["price"]) for t in trades)  # 等于 sum(amount)
    total_qty  = sum(t["amount"] / t["price"] for t in trades)
    avg_price  = total_cost / total_qty
    return avg_price, total_qty


def calc_pnl(avg_price, qty, target_price, position):
    """
    计算盈亏（pnl）
    avg_price: 平均价
    qty      : 数量
    target_price: 止盈或止损价
    position: long 或 short
    """
    if position == "long":
        return (target_price - avg_price) * qty
    else:
        return (avg_price - target_price) * qty


def analyze(trades, take_profit, stop_loss, initial_capital):
    # 计算平均价与总数量
    avg_price, qty = calc_avg_price(trades)

    print("========== 开仓明细 ==========")
    print(f"平均价: {avg_price:.2f}")
    print(f"总数量: {qty:.6f}")
    print(f"总本金: {initial_capital:,.2f}")
    print("================================\n")

    results = {}

    for position in ["long", "short"]:
        print(f"====== {position.upper()}（做多/做空） 计算结果 ======")

        # 止盈盈亏
        tp_pnl = calc_pnl(avg_price, qty, take_profit, position)
        tp_after = initial_capital + tp_pnl

        # 止损盈亏
        sl_pnl = calc_pnl(avg_price, qty, stop_loss, position)
        sl_after = initial_capital + sl_pnl

        print(f"若是目标止盈价格为 {take_profit}，")
        print(f"那将会 {'赚取' if tp_pnl >= 0 else '亏损'} {abs(tp_pnl):,.2f}")
        print(f"止盈后剩余资金为 {tp_after:,.2f}\n")

        print(f"若是目标止损价格为 {stop_loss}，")
        print(f"那将会 {'赚取' if sl_pnl >= 0 else '亏损'} {abs(sl_pnl):,.2f}")
        print(f"止损后剩余资金为 {sl_after:,.2f}\n")

        print("================================\n")

        results[position] = {
            "tp_pnl": tp_pnl,
            "tp_after": tp_after,
            "sl_pnl": sl_pnl,
            "sl_after": sl_after,
            "avg_price": avg_price,
            "qty": qty
        }

    return results


def show_table(trades, take_profit, stop_loss, initial_capital, position="long"):
    avg_price_all, qty_all = calc_avg_price(trades)

    pos_label = "LONG" if position == "long" else "SHORT"
    print(f"逐笔建仓明细表（{pos_label}）")
    print("-" * 150)
    header = (
        f"{'#':>2}  {'价格':>10}  {'仓位':>12}  {'净持仓':>12}  "
        f"{'均价':>10}  "
        f"{'浮盈':>12}  {'止盈后资金':>14}  "
        f"{'浮亏':>12}  {'止损后资金':>14}"
    )
    print(header)
    print("-" * 150)

    cum_amount = 0
    for idx, _ in enumerate(trades, start=1):
        sub_trades = trades[:idx]
        avg_price, qty = calc_avg_price(sub_trades)
        cum_amount = sum(t["amount"] for t in sub_trades)

        # 根据选择的方向计算盈亏
        tp_pnl = calc_pnl(avg_price, qty, take_profit, position)
        sl_pnl = calc_pnl(avg_price, qty, stop_loss, position)
        tp_after = initial_capital + tp_pnl
        sl_after = initial_capital + sl_pnl

        last_trade = trades[idx - 1]
        price = last_trade["price"]
        amount = last_trade["amount"]

        print(
            f"{idx:>2}  "
            f"{price:>10,.2f}  "
            f"{amount:>12,.2f}  "
            f"{cum_amount:>12,.2f}  "
            f"{avg_price:>10,.2f}  "
            f"{tp_pnl:>12,.2f}  "
            f"{tp_after:>14,.2f}  "
            f"{sl_pnl:>12,.2f}  "
            f"{sl_after:>14,.2f}"
        )

    print("-" * 150)


def calc_target_price_for_return(avg_price, qty, capital_base, return_pct, position):
    """根据期望收益百分比，反推目标价格。

    capital_base: 用来衡量收益的基数（这里用净持仓金额）。
    return_pct : 希望赚取的比例，比如 0.1 表示 +10%，-0.05 表示 -5%。
    position    : "long" 或 "short"。
    """
    target_pnl = capital_base * return_pct

    if position == "long":
        # (target_price - avg_price) * qty = target_pnl
        return avg_price + target_pnl / qty
    else:
        # (avg_price - target_price) * qty = target_pnl
        return avg_price - target_pnl / qty


def show_target_prices_for_return(trades, initial_capital, return_pct, position="long"):
    """给定目标收益百分比，展示单一方向的止盈 / 止损目标价。

    会分别按照“净持仓金额”和“本金”两种基数计算目标收益。
    """
    avg_price, qty = calc_avg_price(trades)
    net_position_amount = sum(t["amount"] for t in trades)

    tp_pct = return_pct          # 止盈：赚 return_pct
    sl_pct = -return_pct         # 止损：亏 return_pct

    pos_label = "LONG" if position == "long" else "SHORT"

    print("目标收益百分比设置")
    print("-" * 80)
    print(f"当前均价: {avg_price:.2f}  总数量: {qty:.6f}  净持仓金额: {net_position_amount:,.2f}  本金: {initial_capital:,.2f}")
    print(f"方向: {pos_label}  目标收益: {return_pct * 100:.2f}%")
    print()

    bases = [
        ("持仓收益", net_position_amount),
        ("本金收益", initial_capital),
    ]

    for label, base_amount in bases:
        tp_price = calc_target_price_for_return(avg_price, qty, base_amount, tp_pct, position)
        sl_price = calc_target_price_for_return(avg_price, qty, base_amount, sl_pct, position)

        print(f"{label}（基数: {base_amount:,.2f}）:")
        print(f"  止盈 {return_pct * 100:.2f}% 对应目标价格: {tp_price:.2f}")
        print(f"  止损 {return_pct * 100:.2f}% 对应目标价格: {sl_price:.2f}")
        print()

    print("-" * 80)


def suggest_capital_adjustments(trades, initial_capital, desired_price, target_return_pct,
                                hedge_entry_price, spot_entry_price, position="long"):
    """给出需要新增的对冲（做空）或现货（加仓）金额，让本金收益达到目标。"""
    avg_price, qty = calc_avg_price(trades)
    pos_label = "LONG" if position == "long" else "SHORT"

    current_pnl = calc_pnl(avg_price, qty, desired_price, position)
    target_pnl = initial_capital * target_return_pct
    pnl_gap = target_pnl - current_pnl

    print("本金收益调节建议")
    print("-" * 80)
    print(f"方向: {pos_label}  目标价: {desired_price:,.2f}")
    print(f"当前PnL: {current_pnl:,.2f}  目标PnL: {target_pnl:,.2f}  差额: {pnl_gap:,.2f}")
    print()

    def qty_needed(entry_price, direction):
        unit_pnl = calc_pnl(entry_price, 1, desired_price, direction)
        if abs(unit_pnl) < 1e-9:
            return None, None
        qty_val = pnl_gap / unit_pnl
        amount_val = qty_val * entry_price
        return qty_val, amount_val

    # 对冲（开反向仓位）
    hedge_direction = "short" if position == "long" else "long"
    hedge_qty, hedge_amount = qty_needed(hedge_entry_price, hedge_direction)
    if hedge_qty is None:
        hedge_results = "对冲价与目标价相同，无法通过对冲调节。"
    else:
        hedge_results = (
            f"需要{'做空' if hedge_direction == 'short' else '做多'}数量: {hedge_qty:+.4f} BTC"
            f" （金额 {hedge_amount:+,.2f}，建仓价 {hedge_entry_price:,.2f}）"
        )

    # 买现货（同方向加仓）
    spot_qty, spot_amount = qty_needed(spot_entry_price, position)
    if spot_qty is None:
        spot_results = "加仓价与目标价相同，无法通过买现货调节。"
        new_avg = float("inf")
    else:
        new_qty = qty + spot_qty
        new_avg = ((qty * avg_price) + (spot_qty * spot_entry_price)) / new_qty if new_qty else float("inf")
        action_word = "买入" if position == "long" else "卖出"
        spot_results = (
            f"需要{action_word}数量: {spot_qty:+.4f} BTC （金额 {spot_amount:+,.2f}，价位 {spot_entry_price:,.2f}）\n"
            f"  新平均价 ≈ {new_avg:,.2f}"
        )

    print("方式一：对冲（反向仓位）")
    print(hedge_results)
    print()
    print("方式二：买现货（同向加仓）")
    print(spot_results)
    print("-" * 80)


# ======================
# 示例输入（与你截图一致）
# ======================

trades = [
    {"price": 102313.00, "amount": 300000.00},
    {"price": 83888.00, "amount": 300000.00},
    {"price": 78888.80, "amount": 1000000.00},
]

take_profit = 100000
stop_loss   = 90000
initial_capital = 2_000_000  # 200万本金

# 运行
analyze(trades, take_profit, stop_loss, initial_capital)

# 选择表格展示方向: 'long' 或 'short'
table_position = "long"  # 改成 "short" 即可查看做空表
show_table(trades, take_profit, stop_loss, initial_capital, position=table_position)

# 目标收益百分比示例：希望赚取 10%
target_return_pct = 0.10
show_target_prices_for_return(trades, initial_capital, target_return_pct, position=table_position)

# 本金收益调节示例（目标价沿用 take_profit，可自行修改参数）
desired_price = take_profit
hedge_entry_price = 95_000
spot_entry_price = 82_000
suggest_capital_adjustments(
    trades,
    initial_capital,
    desired_price=desired_price,
    target_return_pct=target_return_pct,
    hedge_entry_price=hedge_entry_price,
    spot_entry_price=spot_entry_price,
    position=table_position,
)
