---
title: "StripeとNext.jsで決済機能を実装する——Checkout・Webhook・本番対応まで"
emoji: "💳"
type: "tech"
topics: ["nextjs", "TypeScript"]
published: false
canonical_url: "https://www.taka-techblog.com/blog/nextjs-stripe-payment"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/nextjs-stripe-payment?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::

Next.jsで決済機能を実装するとき、一番手堅い選択はStripeだ。APIの設計が分かりやすく、TypeScriptのSDKも充実している。PCI DSS対応もStripe側に任せられるため、厳格なコンプライアンスが求められるプロジェクトにも導入しやすい。

## 実装の全体像

```
ユーザー → 購入ボタン → Next.js API Route
→ Stripe Checkout Session 作成
→ Stripeのホスト画面へリダイレクト
→ 決済完了 → Webhook で Next.js に通知
→ DB更新・メール送信
```

## セットアップ

```bash
npm install stripe @stripe/stripe-js
```

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 1. Checkout Session を作成する

```ts
// app/api/checkout/route.ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

export async function POST(req: NextRequest) {
  const { priceId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
```

## 2. Webhookで決済完了を受け取る（最重要）

**`success_url`だけで注文確定処理をしてはいけない。** ユーザーがブラウザを閉じると処理が実行されない。決済完了の処理は必ずWebhookで行う。

```ts
// app/api/webhooks/stripe/route.ts
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    // 署名検証——これを省くとなりすましリクエストを受け入れてしまう
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleOrderCompletion(session);
  }

  return NextResponse.json({ received: true });
}
```

## ローカルでWebhookをテストする

```bash
# Stripe CLIで転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# テスト送信
stripe trigger checkout.session.completed
```

## 本番リリース前チェックリスト

- [ ] テストキー（`sk_test_`）を本番キー（`sk_live_`）に切り替えた
- [ ] Webhookの署名検証が必ず通っている
- [ ] エラー時に適切なHTTPステータスコードを返している（Stripeは200以外をリトライする）
- [ ] 冪等性を確保している（同じWebhookが2回来ても二重処理しない）
- [ ] `success_url`だけで注文確定処理をしていない

## まとめ

基本的な実装は4ステップ。

1. Checkout Sessionを作成するAPI Routeを作る
2. 購入ボタンからそのAPIを呼ぶ
3. WebhookでStripeからの通知を受け取る
4. Webhook内で注文完了処理を実行する

このトピックはAppendixとして以下の書籍に収録されている。

https://www.amazon.co.jp/dp/4297129167

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
