#!/bin/bash

# ============================================
# 快速部署腳本（精簡版）
# ============================================

echo "========================================="
echo "   快速部署 Kanban 看板"
echo "========================================="

# 檢查必要參數
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "用法: ./quick-deploy.sh <GitHub用戶> <專案名稱>"
    echo "範例: ./quick-deploy.sh julianpjlee20-lang my-kanban"
    exit 1
fi

GITHUB_USER=$1
PROJECT_NAME=$2
REGION=${3:-nrt}
PLAN=${4:-vc2-1c-1gb}

echo "GitHub 用戶: $GITHUB_USER"
echo "專案名稱: $PROJECT_NAME"

# 讀取 API Key
VULTR_API_KEY=$(grep "VULTR_API_KEY" ~/.openclaw/workspace/.env | cut -d'=' -f2)
GITHUB_TOKEN=$(grep "GITHUB_TOKEN" ~/.openclaw/workspace/.env | cut -d'=' -f2)

if [ -z "$VULTR_API_KEY" ]; then
    echo "錯誤: 找不到 VULTR_API_KEY"
    exit 1
fi

# 建立 Vultr 伺服器
echo "建立 Vultr 伺服器..."
RESPONSE=$(curl -s -X POST "https://api.vultr.com/v2/instances" \
    -H "Authorization: Bearer $VULTR_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"region\": \"$REGION\", \"plan\": \"$PLAN\", \"label\": \"$PROJECT_NAME\", \"image_id\": \"docker\"}")

INSTANCE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "實例 ID: $INSTANCE_ID"

# 等待上線
echo "等待伺服器上線..."
for i in {1..30}; do
    STATUS=$(curl -s -X GET "https://api.vultr.com/v2/instances/$INSTANCE_ID" \
        -H "Authorization: Bearer $VULTR_API_KEY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$STATUS" = "active" ]; then
        break
    fi
    sleep 2
done

SERVER_IP=$(curl -s -X GET "https://api.vultr.com/v2/instances/$INSTANCE_ID" \
    -H "Authorization: Bearer $VULTR_API_KEY" | grep -o '"main_ip":"[^"]*"' | cut -d'"' -f4)

echo "伺服器 IP: $SERVER_IP"

# 從回應取得密碼
SERVER_PASSWORD=$(echo $RESPONSE | grep -o '"default_password":"[^"]*"' | cut -d'"' -f4 | tr -d '\\')

echo "密碼: $SERVER_PASSWORD"

# 部署
echo "部署中..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "apt update && apt install -y git docker-compose"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "cd /root && git clone https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$PROJECT_NAME.git"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "cd /root/$PROJECT_NAME && docker build -t $PROJECT_NAME-app ."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "docker rm -f $PROJECT_NAME 2>/dev/null || true"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "docker run -d -p 3000:3000 --name $PROJECT_NAME $PROJECT_NAME-app"

echo "========================================="
echo "   部署完成！"
echo "========================================="
echo "IP: $SERVER_IP"
echo "Port: 3000"
