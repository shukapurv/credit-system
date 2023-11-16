function calculateMonthlyInstallment(loanAmount, annualInterestRate, tenure) {
    if (annualInterestRate === null || annualInterestRate === -1) {
        return 0;
    }
    const monthlyInterestRate = annualInterestRate / 1200;
    const installment = (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -tenure));
    return Math.round(installment);
}

function calculateNewTenure(remainingAmount, annualInterestRate, monthlyRepayment) {
    const monthlyInterestRate = annualInterestRate / 12 / 100;
    let tenure = 0;
    let balance = remainingAmount;

    while (balance > 0) {
        balance += balance * monthlyInterestRate - monthlyRepayment;
        tenure++;
    }

    return tenure;
}

function truncateToTwoDecimals(num) {
    return Math.trunc(num * 100) / 100;
}


module.exports = { calculateMonthlyInstallment, calculateNewTenure, truncateToTwoDecimals };
