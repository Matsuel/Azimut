// Variables exigées par env.ts et la config Kafka : valeurs factices, aucune connexion n'est ouverte par les tests
process.env.INTERNAL_API_KEY ??= "test-internal-key-0000"
process.env.KAFKA_BROKERS ??= "localhost:9094"
process.env.KAFKA_CLIENT_ID ??= "notification-service-test"
