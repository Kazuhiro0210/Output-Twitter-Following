// JavaScriptコード (ブラウザのコンソールで実行 - 改善版)

(async function() {
    console.log("--- フォローしているユーザーの情報を自動取得中 ---");
    console.log("ページ全体が読み込まれるまで時間がかかる場合があります。");
    console.log("途中で中止する場合は、コンソールで Ctrl+C を押してください。");

    const followedUsers = new Map(); // 重複を避けるためにMapを使用 (key: username, value: {displayName, username})
    let previousScrollHeight = 0;
    let scrollCount = 0;
    const MAX_SCROLLS = 500; // 最大スクロール回数（適宜調整してください。多すぎると処理が重くなります）
    const SCROLL_INTERVAL = 1500; // スクロール後の待機時間（ミリ秒）

    // スクロールしてコンテンツを読み込む関数
    const autoScroll = async () => {
        return new Promise(resolve => {
            const intervalId = setInterval(() => {
                const currentScrollHeight = document.documentElement.scrollHeight;
                window.scrollTo(0, currentScrollHeight);

                // スクロール位置が変わらなくなったら、末尾に到達したと判断
                if (currentScrollHeight === previousScrollHeight && scrollCount > 0) {
                    clearInterval(intervalId);
                    resolve(true); // スクロール完了
                } else if (scrollCount >= MAX_SCROLLS) {
                    clearInterval(intervalId);
                    resolve(false); // 最大スクロール回数に到達
                } else {
                    previousScrollHeight = currentScrollHeight;
                    scrollCount++;
                    // console.log(`スクロール中... (${scrollCount}回目)`);
                }
            }, SCROLL_INTERVAL);
        });
    };

    // ユーザー情報を取得する関数
    const extractUsers = () => {
        const userElements = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
        let newUsersCount = 0;

        userElements.forEach(userElement => {
            let username = '';
            let displayName = '';

            const usernameLink = userElement.querySelector('a[role="link"][href^="/"]');
            if (usernameLink) {
                const path = usernameLink.getAttribute('href');
                if (path && path.startsWith('/')) {
                    username = '@' + path.substring(1);
                }
            }

            const displayNameElement = userElement.querySelector('div[dir="ltr"] span span');
            if (displayNameElement) {
                displayName = displayNameElement.textContent;
            }

            if (username && displayName && !followedUsers.has(username)) {
                followedUsers.set(username, {
                    displayName: displayName.replace(/"/g, '""'),
                    username: username.replace(/"/g, '""')
                });
                newUsersCount++;
            }
        });
        return newUsersCount;
    };

    // --- メイン処理 ---
    let lastUserCount = 0;
    let noNewUsersCount = 0; // 新規ユーザーが見つからなかった回数をカウント

    while (true) {
        const newUsersExtracted = extractUsers();
        console.log(`現在のユーザー数: ${followedUsers.size} (新規取得: ${newUsersExtracted}件)`);

        if (newUsersExtracted === 0) {
            noNewUsersCount++;
            if (noNewUsersCount >= 3) { // 3回連続で新規ユーザーがなければ、読み込み完了と判断
                console.log("--- 新しいユーザーが見つからなくなりました。取得完了と判断します。 ---");
                break;
            }
        } else {
            noNewUsersCount = 0; // 新規ユーザーが見つかったらリセット
        }

        const scrolledToEnd = await autoScroll();
        if (scrolledToEnd) {
            // スクロールバーが動かなくなった場合も最終チェック
            extractUsers(); // 最後に残っているかもしれない要素を取得
            console.log("--- ページ末尾に到達しました。取得完了と判断します。 ---");
            break;
        }

        // ある程度スクロールしたら、スクロール位置をチェックする間隔を短くして、より素早く末尾検出できるように調整することも可能ですが、今回はシンプルに固定
        // if (scrollCount > 100) { SCROLL_INTERVAL = 500; } // 例
    }

    if (followedUsers.size === 0) {
        console.error("フォローしているユーザーが見つかりませんでした。ログインしているか、アカウントがプライベートでないか、またはセレクタに問題がある可能性があります。");
        return;
    }

    // CSV形式で出力
    let csvContent = "表示名,ユーザー名\n";
    followedUsers.forEach(user => {
        csvContent += `"${user.displayName}","${user.username}"\n`;
    });

    console.log("--- 最終取得結果 (CSV形式) ---");
    console.log(csvContent);

    // CSVファイルを自動ダウンロードする機能
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'twitter_followed_users_all.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("CSVファイル 'twitter_followed_users_all.csv' をダウンロードしました。");
    } else {
        console.warn("ブラウザがCSVファイルの自動ダウンロードをサポートしていません。上記のCSVコンテンツをコピーしてファイルに貼り付けてください。");
    }

    console.log(`--- 完了: 合計 ${followedUsers.size} 件のユーザー情報を取得しました ---`);
})();
