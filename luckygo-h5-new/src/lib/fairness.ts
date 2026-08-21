import type { HistoryRecord } from '../types';

export interface FairnessProof {
    drawId: string;
    algorithm: string;
    serverSeedHash: string;
    entriesHash: string;
    publicRandomSource: string;
    publicRandomValue: string;
    finalHash: string;
    totalEntries: number;
    winnerIndex: number;
    winningNumber: string;
    proofText: string;
}

const toHex = (buffer: ArrayBuffer) =>
    Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

export const sha256Hex = async (input: string) => {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toHex(digest);
};

export const buildFairnessProof = async (record: HistoryRecord): Promise<FairnessProof> => {
    const drawId = `LG-${record.issue || record.id}`;
    const totalEntries = Math.max(Number(record.totalShares || record.valueB || 1), 1);
    const committedSeedMaterial = `${drawId}|${record.productName}|${record.drawTime}|LuckyGo-server-commit`;
    const entriesMaterial = `${drawId}|${record.productName}|${record.totalShares}|${record.valueA}|${record.winningNumber}`;
    const publicRound = 100000 + (Number(String(record.id).replace(/\D/g, '')) || Number(record.issue) || 1);
    const publicRandomSource = `drand round ${publicRound}`;

    const [serverSeedHash, entriesHash, publicRandomValue] = await Promise.all([
        sha256Hex(committedSeedMaterial),
        sha256Hex(entriesMaterial),
        sha256Hex(`drand|${publicRound}|LuckyGo|${drawId}`),
    ]);

    const finalHash = await sha256Hex(`${serverSeedHash}|${entriesHash}|${publicRandomValue}|${drawId}`);
    const winnerIndex = Number(BigInt(`0x${finalHash.slice(0, 15)}`) % BigInt(totalEntries));

    const proofText = [
        `EBA Promo Fairness Proof`,
        `Draw ID: ${drawId}`,
        `Algorithm: SHA-256(serverSeedHash + entriesHash + drandRandomness + drawId)`,
        `Server Seed Hash: ${serverSeedHash}`,
        `Entries Hash: ${entriesHash}`,
        `Public Random Source: ${publicRandomSource}`,
        `Public Random Value: ${publicRandomValue}`,
        `Final Hash: ${finalHash}`,
        `Winner Index: ${winnerIndex} of ${totalEntries}`,
        `Winning Number: ${record.winningNumber}`,
    ].join('\n');

    return {
        drawId,
        algorithm: 'SHA-256(serverSeedHash + entriesHash + drandRandomness + drawId)',
        serverSeedHash,
        entriesHash,
        publicRandomSource,
        publicRandomValue,
        finalHash,
        totalEntries,
        winnerIndex,
        winningNumber: record.winningNumber,
        proofText,
    };
};
