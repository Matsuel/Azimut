import { TrendingDown, TrendingUp } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Direction, Tone } from "@/lib/trend"

const arrows = {
    up: <TrendingUp data-icon="inline-start" />,
    down: <TrendingDown data-icon="inline-start" />,
    none: null,
} as const satisfies Record<Direction, ReactNode>

const tones = {
    positive: { variant: "success" },
    negative: { variant: "outline", className: "border-destructive/30 text-destructive" },
    neutral: { variant: "outline", className: "text-muted-foreground" },
} as const satisfies Record<Tone, { variant: "success" | "outline"; className?: string }>

interface StatCardProps {
    label: ReactNode
    value: ReactNode
    caption?: ReactNode
    delta?: ReactNode
    trend?: Direction // flèche du badge
    tone?: Tone // couleur du badge, indépendante de la flèche
    className?: string
}

export function StatCard({ label, value, caption, delta, trend = "none", tone = "neutral", className }: StatCardProps) {
    const t: { variant: "success" | "outline"; className?: string } = tones[tone]

    return (
        <Card className={className}>
            <CardContent className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-body text-muted-foreground">{label}</span>
                    {delta != null && (
                        <Badge variant={t.variant} className={t.className}>
                            {arrows[trend]}
                            {delta}
                        </Badge>
                    )}
                </div>
                <span className="text-stat">{value}</span>
                {caption && <span className="text-small text-muted-foreground">{caption}</span>}
            </CardContent>
        </Card>
    )
}
