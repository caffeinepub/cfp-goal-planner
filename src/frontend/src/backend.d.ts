import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Client {
    id: bigint;
    age: bigint;
    sex: string;
    occupation?: string;
    name: string;
    createdAt: bigint;
    email?: string;
    income?: bigint;
    phone?: string;
}
export interface Goal {
    id: bigint;
    annualSIPStepUp: number;
    clientId: bigint;
    inflationRate: number;
    simCount: bigint;
    strategy: string;
    annualSIP: bigint;
    name: string;
    createdAt: bigint;
    presentValue: bigint;
    lumpSum: bigint;
    updatedAt: bigint;
    monthlySIPStepUp: number;
    timeHorizon: bigint;
    monthlySIP: bigint;
    strategyMean: number;
    strategySD: number;
}
export interface backendInterface {
    createClient(name: string, age: bigint, sex: string, occupation: string | null, income: bigint | null, phone: string | null, email: string | null): Promise<bigint>;
    createGoal(clientId: bigint, name: string, presentValue: bigint, inflationRate: number, timeHorizon: bigint, strategy: string, strategyMean: number, strategySD: number, lumpSum: bigint, monthlySIP: bigint, monthlySIPStepUp: number, annualSIP: bigint, annualSIPStepUp: number, simCount: bigint): Promise<bigint>;
    deleteClient(id: bigint): Promise<void>;
    deleteGoal(id: bigint): Promise<void>;
    getClient(id: bigint): Promise<Client>;
    getGoal(id: bigint): Promise<Goal>;
    listAllGoals(): Promise<Array<Goal>>;
    listClients(): Promise<Array<Client>>;
    listGoalsByClient(clientId: bigint): Promise<Array<Goal>>;
    updateClient(id: bigint, name: string, age: bigint, sex: string, occupation: string | null, income: bigint | null, phone: string | null, email: string | null): Promise<void>;
    updateGoal(id: bigint, clientId: bigint, name: string, presentValue: bigint, inflationRate: number, timeHorizon: bigint, strategy: string, strategyMean: number, strategySD: number, lumpSum: bigint, monthlySIP: bigint, monthlySIPStepUp: number, annualSIP: bigint, annualSIPStepUp: number, simCount: bigint): Promise<void>;
}
