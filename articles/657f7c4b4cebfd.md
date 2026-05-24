---
title: "StripeとNext.jsで決済機能を実装する——Checkout・Webhook・本番対応まで"
emoji: "💳"
type: "tech"
topics: ["nextjs","TypeScript"]
published: false
canonical_url: "https://www.taka-techblog.com/blog/nextjs-stripe-payment"
---

:::message
この記事は [taka-techblog](https://www.taka-techblog.com/blog/nextjs-stripe-payment?utm_source=zenn&utm_medium=referral) にも掲載しています。
:::



Next.jsで決済機能を実装するとき、一番手堅い選択はStripeだ。

APIの設計が分かりやすく、Webhookの仕組みが整備されており、TypeScriptのSDKも充実している。PCI DSSの対応もStripe側に任せられるため、医療・金融系など厳格なコンプライアンスが求められるプロジェクトにも導入しやすい。

---

## 実装の全体像

```
ユーザー →（購入ボタン）→ Next.js API Route
→ Stripe Checkout Session 作成
→ Stripeのホスト画面へリダイレクト
→ 決済完了 → Webhook で Next.js に通知
→ DB更新・メール送信など
```

Stripe Checkoutを使うことで、カード情報の入力フォームをStripeのホスト画面に委ねられる。カード情報がアプリサーバーを通らないため、PCI DSS対応が大幅に簡略化される。

---

## セットアップ

```bash
npm install stripe @stripe/stripe-js
```

```
# .env.local
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

シークレットキーは**サーバーサイドのみ**で使用する。`NEXT_PUBLIC_`プレフィックスのないキーはクライアントに漏洩しない。

---

## 1. Checkout Session を作成する API Route

```ts
// app/api/checkout/route.ts

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export async function POST(req: NextRequest) {
  try {
    const { priceId, quantity = 1 } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'チェックアウトの作成に失敗しました' },
      { status: 500 }
    );
  }
}
```

---

## 2. 購入ボタンのコンポーネント

```tsx
// components/BuyButton.tsx
'use client';

type Props = {
  priceId: string;
  label?: string;
};

export function BuyButton({ priceId, label = '購入する' }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const { url, error } = await res.json();

      if (error) {
        alert('エラーが発生しました。再度お試しください。');
        return;
      }

      window.location.href = url;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? '処理中...' : label}
    </button>
  );
}
```

---

## 3. Webhook で決済完了を受け取る

Webhookはもっとも重要な部分だ。リダイレクト先の`success_url`はユーザーがブラウザで直接アクセスできるため、信頼できる決済完了通知として使えない。**決済完了の処理は必ずWebhookで行う**。

```ts
// app/api/webhooks/stripe/route.ts

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // 署名検証——これを省くとなりすましリクエストを受け入れてしまう
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // DBの注文ステータス更新・メール送信など
      await handleOrderCompletion(session);
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error('Payment failed:', paymentIntent.id);
      break;
    }
    default:
      // 処理しないイベントは無視してOK（200を返す）
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleOrderCompletion(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  // DB更新処理...
}
```

---

## 4. ローカルでWebhookをテストする

```bash
# Stripe CLIをインストール
brew install stripe/stripe-cli/stripe

# ローカルサーバーにWebhookを転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 別ターミナルで決済イベントをテスト送信
stripe trigger checkout.session.completed
```

`STRIPE_WEBHOOK_SECRET` はローカル開発では `stripe listen` が表示するシークレットを使う。本番では StripeダッシュボードのWebhookエンドポイントから取得する。

---

## 本番リリース前チェックリスト

- [ ] テストキー（`sk_test_`）を本番キー（`sk_live_`）に切り替えた
- [ ] `STRIPE_WEBHOOK_SECRET` を本番Webhookエンドポイントのシークレットに更新した
- [ ] Webhookの署名検証が必ず通っている（`constructEvent`をスキップしていない）
- [ ] エラー時に適切なHTTPステータスコードを返している（Stripeは200以外をリトライする）
- [ ] 冪等性を確保している（同じWebhookが2回来ても二重処理しない）
- [ ] `success_url`だけで注文確定処理をしていない
- [ ] カード情報がサーバーログに出力されていない

---

## サブスクリプションへの拡張

`mode: 'payment'` を `mode: 'subscription'` に変えると定期課金に対応できる。

```ts
const session = await stripe.checkout.sessions.create({
  mode: 'subscription', // ここを変更
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: '...',
  cancel_url: '...',
});
```

Webhookで `customer.subscription.updated` や `invoice.payment_failed` を処理することで、解約・支払い失敗時の対応も実装できる。

---

## まとめ

Stripeは複雑に見えるが、基本的な実装は4ステップだ。

1. Checkout Sessionを作成するAPI Routeを作る
2. 購入ボタンからそのAPIを呼ぶ
3. WebhookでStripeからの通知を受け取る
4. Webhook内で注文完了処理を実行する

「`success_url`だけで注文完了にする」ミスは最もよくある実装ミスで、ユーザーがリダイレクト前にブラウザを閉じると注文が宙に浮く。Webhookへの処理移行を最初から設計しておくことが重要だ。

このトピックはAppendixとして[TypeScriptとReact/Next.js実践本](/blog/typescript-react-nextjs-book-review)に収録されている。実際に手を動かして実装してみると、本書の概説がより深く理解できる。

---

他の記事も読む → [taka-techblog.com](https://www.taka-techblog.com?utm_source=zenn&utm_medium=referral)
X でも発信中 → [@_taka_tech](https://x.com/_taka_tech)
