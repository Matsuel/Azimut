import { CompressionTypes, type Producer } from "kafkajs";
import type { KafkaMessage } from "./kafka.types";

export class KafkaProducer {
    private ready = false;
    private listening = false;

    constructor(private readonly producer: Producer) { }

    /** Vrai entre `CONNECT` et `DISCONNECT` du producer kafkajs. Sert aux sondes `/readiness`. */
    isReady(): boolean {
        return this.ready;
    }

    async connect(): Promise<void> {
        // Un `connect()` rappelé (nouvelle tentative au démarrage) ne doit pas doubler les écouteurs
        if (!this.listening) {
            this.producer.on(this.producer.events.CONNECT, () => { this.ready = true; });
            this.producer.on(this.producer.events.DISCONNECT, () => { this.ready = false; });
            this.listening = true;
        }
        await this.producer.connect();
    }

    async publish<T>(
        topic: string,
        message: KafkaMessage<T>
    ): Promise<void> {
        await this.producer.send({
            topic,
            // La limite du broker (~1 Mo par défaut) s'applique au message compressé : un long backtest (courbes journalières) la dépasse en JSON brut
            compression: CompressionTypes.GZIP,
            messages: [
                {
                    key: message.key,
                    value: JSON.stringify(message.value),
                    headers: message.headers,
                },
            ],
        });
    }

    async disconnect(): Promise<void> {
        await this.producer.disconnect();
    }
}