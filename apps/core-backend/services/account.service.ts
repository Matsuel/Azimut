import { createKafkaEvent } from "@azimut/kafka"
import { Logger } from "@azimut/utils"
import { ACCOUNT_TOPICS, type UserDataResetPayload } from "@azimut/contracts"
import AccountRepository, { type IAccountRepository } from "../repositories/account.repository"
import { producer } from "../lib/kafka"

const logger = Logger.here()

class AccountService {
    repo: IAccountRepository = new AccountRepository()
    // Publication de `user.data.reset` (substituable en test)
    publish = (payload: UserDataResetPayload) =>
        producer.publish(ACCOUNT_TOPICS.dataReset, { key: payload.userId, value: createKafkaEvent(ACCOUNT_TOPICS.dataReset, payload) })

    /**
     * Efface les données de l'utilisateur (irréversible), puis publie `user.data.reset` pour que notification-service purge les siennes.
     * Une transaction en échec remonte son erreur sans rien publier. Un échec de publication est loggué sans lever :
     * les données sont déjà effacées et l'appel ne doit pas paraître échoué (pas d'outbox, comme `notification.requested`).
     */
    async resetData(userId: string): Promise<void> {
        logger.info("Resetting user data", { userId })
        await this.repo.deleteUserData(userId)
        try {
            await this.publish({ userId })
        } catch (error) {
            logger.error("Failed to publish user data reset", { userId, error })
        }
        logger.info("User data reset", { userId })
    }
}

export default AccountService
