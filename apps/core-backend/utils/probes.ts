import { kafkaCheck, type ProbeCheck } from "@azimut/http";
import { consumer, producer } from "../lib/kafka";
import { isDbConnected } from "./db";

// Dépendances de core-backend (D3), lues par `/readiness` et par la page Monitoring (sans appel réseau) :
// le consumer et le producer ne sont prêts qu'une fois connectés à Kafka
export const CORE_BACKEND_CHECKS: ProbeCheck[] = [{ name: "database", check: isDbConnected }, kafkaCheck([consumer, producer])];
