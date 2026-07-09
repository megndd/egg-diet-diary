# 蛋蛋的轻盈饮食日记 PWA

这是一个 iPhone 可用的网页版 / PWA 版本，不需要 Mac、不需要 Xcode、不需要 App Store。

## 功能

- 首页 Dashboard
- 今日记录
- 胀气观察
- 趋势统计
- 我的资料
- 本地离线存储
- 胀气风险食物自动识别
- 本地规则建议
- 数据导出、清空
- 可添加到 iPhone 主屏幕

## 在电脑上预览

可以直接打开 `index.html` 预览大部分功能。  
如果要测试“离线缓存 / 添加到主屏幕”，需要通过 http 或 https 访问。

## 放到 iPhone 17 Pro Max 使用

最简单的方式是把整个 `EggDietDiaryPWA` 文件夹上传到任意静态网页托管服务，例如：

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

上传后，用 iPhone Safari 打开网页地址：

1. 点 Safari 底部分享按钮。
2. 选择“添加到主屏幕”。
3. 桌面会出现“轻盈日记”图标。
4. 以后从桌面打开即可像 App 一样使用。

注意：iPhone 添加到主屏幕通常需要使用 Safari，并且网页最好是 https 地址。

## 本地数据说明

所有记录保存在当前浏览器本地存储中，不会上传服务器。  
如果删除网站数据、清理 Safari 数据或更换浏览器，记录可能会丢失。建议定期在“我的资料”里导出 JSON 备份。

