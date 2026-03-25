import { NextResponse } from "next/server";

export async function GET() {
    // Mock backend delays
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mockMarkets = [
        {
            id: "1",
            question: "Will Bitcoin hit $100k before December?",
            yesPrice: 0.42,
            noPrice: 0.58,
            endTime: "2026-12-01T00:00:00Z",
            volume: "$4.5M",
            category: "Crypto"
        },
        {
            id: "2",
            question: "Will the Fed cut rates in Q4 2026?",
            yesPrice: 0.65,
            noPrice: 0.35,
            endTime: "2026-12-31T00:00:00Z",
            volume: "$1.2M",
            category: "Finance"
        },
        {
            id: "3",
            question: "Will SpaceX land on Mars in 2026?",
            yesPrice: 0.12,
            noPrice: 0.88,
            endTime: "2026-12-31T23:59:59Z",
            volume: "$890K",
            category: "Science"
        },
        {
            id: "4",
            question: "Ethereum ETF approved by SEC?",
            yesPrice: 0.88,
            noPrice: 0.12,
            endTime: "2026-06-30T00:00:00Z",
            volume: "$3.1M",
            category: "Crypto"
        },
        {
            id: "5",
            question: "Will GPT-5 be released by OpenAI before 2027?",
            yesPrice: 0.76,
            noPrice: 0.24,
            endTime: "2026-12-31T00:00:00Z",
            volume: "$2.4M",
            category: "Technology"
        },
        {
            id: "6",
            question: "US GDP growth > 2.5% in 2026?",
            yesPrice: 0.55,
            noPrice: 0.45,
            endTime: "2027-01-31T00:00:00Z",
            volume: "$1.8M",
            category: "Economy"
        }
    ];

    return NextResponse.json({ markets: mockMarkets });
}
