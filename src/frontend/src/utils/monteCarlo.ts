// Log-normal Monte Carlo simulation
// Returns: for each year 1..T, the corpus at 5th, 50th, 75th, 96th percentile
// across all simulation paths

export interface SimulationInput {
  presentValue: number; // target corpus (already inflation-adjusted)
  timeHorizon: number; // years
  meanReturn: number; // annual return mean as decimal (e.g. 0.11 for 11%)
  sdReturn: number; // annual return SD as decimal
  lumpSum: number; // initial lump sum investment
  monthlySIP: number; // monthly SIP amount
  monthlySIPStepUp: number; // annual step-up % for monthly SIP (e.g. 10 for 10%)
  annualSIP: number; // annual SIP amount
  annualSIPStepUp: number; // annual step-up % for annual SIP
  simCount: number; // 1000 or 10000
}

export interface YearlyPercentiles {
  year: number;
  annualSIPAmount: number; // annual SIP for this year (after step-up)
  monthlySIPAmount: number; // monthly SIP equivalent
  p5: number;
  p50: number;
  p75: number;
  p96: number;
}

export interface SimulationResult {
  successRate: number; // % of paths >= target
  p5Final: number;
  p50Final: number;
  p75Final: number;
  p96Final: number;
  yearlyData: YearlyPercentiles[];
}

// Box-Muller transform for normal random numbers
function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function percentile(sorted: number[], p: number, count: number): number {
  const idx = Math.min(Math.floor(p * count), count - 1);
  return sorted[idx] ?? 0;
}

export function runMonteCarlo(input: SimulationInput): SimulationResult {
  const {
    timeHorizon,
    meanReturn,
    sdReturn,
    lumpSum,
    monthlySIP,
    monthlySIPStepUp,
    annualSIP,
    annualSIPStepUp,
    simCount,
    presentValue,
  } = input;

  // Clamp time horizon to a reasonable range
  const T = Math.max(1, Math.min(timeHorizon, 50));

  // Log-normal parameters for annual returns
  // Using the correct log-normal parameterization
  const variance = sdReturn * sdReturn;
  const mu =
    Math.log(1 + meanReturn) -
    0.5 * Math.log(1 + variance / ((1 + meanReturn) * (1 + meanReturn)));
  const sigma = Math.sqrt(
    Math.log(1 + variance / ((1 + meanReturn) * (1 + meanReturn))),
  );

  // Store corpus values per year across simulations
  const yearlyCorpusArrays: Float64Array[] = Array.from(
    { length: T },
    () => new Float64Array(simCount),
  );

  for (let s = 0; s < simCount; s++) {
    let corpus = lumpSum;

    for (let y = 0; y < T; y++) {
      // Annual return drawn from log-normal
      const annualReturn = Math.exp(mu + sigma * gaussianRandom()) - 1;

      // Monthly SIP for this year (step-up applied each year)
      const mSIP = monthlySIP * (1 + monthlySIPStepUp / 100) ** y;
      // Annual SIP for this year
      const aSIP = annualSIP * (1 + annualSIPStepUp / 100) ** y;

      // Monthly compounding
      const monthlyReturn = (1 + annualReturn) ** (1 / 12) - 1;

      // Compound existing corpus for 12 months
      let yearEndCorpus = corpus * (1 + monthlyReturn) ** 12;

      // Add monthly SIPs compounded for remaining months
      for (let m = 0; m < 12; m++) {
        yearEndCorpus += mSIP * (1 + monthlyReturn) ** (11 - m);
      }

      // Add annual SIP at start of year compounded for full year
      yearEndCorpus += aSIP * (1 + annualReturn);

      corpus = yearEndCorpus;
      yearlyCorpusArrays[y][s] = corpus;
    }
  }

  // Compute percentiles for each year
  const yearlyData: YearlyPercentiles[] = [];
  for (let y = 0; y < T; y++) {
    const yearValues = Array.from(yearlyCorpusArrays[y]).sort((a, b) => a - b);
    const mSIP = monthlySIP * (1 + monthlySIPStepUp / 100) ** y;
    const aSIP = annualSIP * (1 + annualSIPStepUp / 100) ** y;
    yearlyData.push({
      year: y + 1,
      annualSIPAmount: aSIP + mSIP * 12,
      monthlySIPAmount: mSIP + aSIP / 12,
      p5: percentile(yearValues, 0.05, simCount),
      p50: percentile(yearValues, 0.5, simCount),
      p75: percentile(yearValues, 0.75, simCount),
      p96: percentile(yearValues, 0.96, simCount),
    });
  }

  // Final year stats
  const finalValues = Array.from(yearlyCorpusArrays[T - 1]).sort(
    (a, b) => a - b,
  );
  const successCount = finalValues.filter((v) => v >= presentValue).length;

  return {
    successRate: (successCount / simCount) * 100,
    p5Final: percentile(finalValues, 0.05, simCount),
    p50Final: percentile(finalValues, 0.5, simCount),
    p75Final: percentile(finalValues, 0.75, simCount),
    p96Final: percentile(finalValues, 0.96, simCount),
    yearlyData,
  };
}
