# Payment Clock

[Stripe Test Clock](https://docs.stripe.com/billing/testing/test-clocks) を管理するためのデスクトップアプリケーションです。Tauri、React、Rust で構築されています。

Stripe Test Clock は時間の経過をシミュレートし、サブスクリプションの課金やインボイスなど、時間に依存する Stripe の機能をテストできます。Payment Clock は、コードを書いたり Stripe Dashboard を使わずに、テストクロックの作成・時間の進行・モニタリングを視覚的に行えるインターフェースを提供します。

## 機能

- **マルチアカウント対応** - 複数の Stripe アカウントを管理し、切り替えが可能
- **テストクロック管理** - テストクロックの作成・一覧表示・時間進行・削除
- **進行プレビュー** - 時間を進める前に、影響を受けるサブスクリプションやインボイスを確認
- **リソース作成** - テストクロック内で顧客の作成、支払い方法の紐付け、サブスクリプションの設定
- **イベントタイムライン** - Stripe イベントと操作履歴を統合タイムラインで表示
- **リソーススナップショット** - 顧客、サブスクリプション、インボイス、PaymentIntent の状態を確認

## 前提条件

- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/tools/install)
## はじめに

```bash
# 依存関係のインストール
npm install

# 開発モードで起動
npm run tauri dev

# プロダクションビルド
npm run tauri build
```

初回起動時に Stripe API キー（`sk_test_` で始まるシークレットキー）の入力が求められます。キーはローカルの SQLite データベースに保存されます。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップフレームワーク | [Tauri 2](https://v2.tauri.app/) |
| フロントエンド | React 19、TypeScript、Tailwind CSS v4 |
| バックエンド | Rust |
| データベース | SQLite（rusqlite） |
| Stripe 通信 | reqwest（HTTP） |

## ライセンス

MIT
