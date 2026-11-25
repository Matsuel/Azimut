import { prisma } from "../prisma"

export interface IAccountRepository {
    deleteUserData(userId: string): Promise<void>
}

class AccountRepository implements IAccountRepository {
    /**
     * Supprime en une transaction les backtests, portefeuilles et demandes de pricing de l'utilisateur. Allocations,
     * exécutions, résultats et comptes de trading partent en cascade (`onDelete: Cascade`) ; `User`, `Account` et `Session` restent.
     */
    async deleteUserData(userId: string): Promise<void> {
        await prisma.$transaction([
            prisma.backtest.deleteMany({ where: { userId } }),
            prisma.portfolio.deleteMany({ where: { userId } }),
            prisma.pricingRequest.deleteMany({ where: { userId } }),
        ])
    }
}

export default AccountRepository
