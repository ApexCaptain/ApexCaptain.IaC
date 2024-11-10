type StockInfo = {
  name: string;
  proportion: number;
  sharesOwned: number;
  sharesPrice: number;
};

type PortfolioRebalanceOption = {
  input?: number;
  forceSell?: boolean;
  portfolio: StockInfo[];
};

const defaultPortfolioRebalanceOption: Required<
  Pick<PortfolioRebalanceOption, 'input' | 'forceSell'>
> = {
  input: 0,
  forceSell: false,
};

const portfolioRebalance = (option: PortfolioRebalanceOption) => {
  const { input, forceSell, portfolio } = {
    ...defaultPortfolioRebalanceOption,
    ...option,
  };

  const portfolioWithBalance = portfolio.map(eachStock => ({
    ...eachStock,
    currentBalance: eachStock.sharesOwned * eachStock.sharesPrice,
  }));

  const meta = portfolioWithBalance.reduce(
    (acc, { proportion, sharesOwned, sharesPrice }) => {
      acc.totalBalance += sharesOwned * sharesPrice;
      acc.totalProportion += proportion;

      return acc;
    },
    {
      totalBalance: input,
      totalProportion: 0,
    },
  );

  const rebalancedPortfolio = portfolioWithBalance
    .sort((front, rear) => rear.sharesPrice - front.sharesPrice)
    .map(eachStock => {
      const estimatedTargetBalance = Math.round(
        (meta.totalBalance / meta.totalProportion) * eachStock.proportion,
      );
      const targetBalance =
        estimatedTargetBalance < eachStock.currentBalance && !forceSell
          ? eachStock.currentBalance
          : estimatedTargetBalance;

      const balanceDiff = targetBalance - eachStock.currentBalance;
      const sharesDiff = Math.floor(balanceDiff / eachStock.sharesPrice);

      meta.totalBalance -= targetBalance;
      meta.totalProportion -= eachStock.proportion;

      return {
        ...eachStock,
        targetBalance,

        balanceDiff,
        sharesDiff,
      };
    });

  let remain =
    input -
    rebalancedPortfolio.reduce(
      (acc, eac) => acc + eac.sharesDiff * eac.sharesPrice,
      0,
    );

  while (true) {
    let hasPurchased = false;
    for (const eachStock of rebalancedPortfolio) {
      if (eachStock.sharesPrice < remain) {
        eachStock.sharesDiff += 1;
        eachStock.balanceDiff += eachStock.sharesPrice;
        eachStock.currentBalance =
          eachStock.sharesOwned * eachStock.sharesPrice;
        remain -= eachStock.sharesPrice;
        hasPurchased = true;
      }
    }
    if (!hasPurchased) break;
  }

  return rebalancedPortfolio;
};

const rebalancedPortfolio = portfolioRebalance({
  input: 1103424,
  //   forceSell: true,
  portfolio: [
    {
      name: 'T_K_S&P500TR(H)',
      proportion: 1,
      sharesOwned: 119,
      sharesPrice: 14390,
    },
    {
      name: 'T_K_SCHD',
      proportion: 1,
      sharesOwned: 139,
      sharesPrice: 12790,
    },
    {
      name: 'T_K_QQQ',
      proportion: 1,
      sharesOwned: 15,
      sharesPrice: 129960,
    },
  ],
});

console.log(rebalancedPortfolio);
