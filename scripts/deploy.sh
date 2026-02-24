#!/bin/bash

# ============================================
# Kanban Board 快速部署腳本
# ============================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 檢查環境變數
check_env() {
    echo -e "${YELLOW}檢查環境變數...${NC}"
    
    if [ -z "$VULTR_API_KEY" ]; then
        echo -e "${RED}錯誤: 請設定 VULTR_API_KEY${NC}"
        exit 1
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${RED}錯誤: 請設定 GITHUB_TOKEN${NC}"
        exit 1
    fi
    
    if [ -z "$CLOUDFLARE_TUNNEL_API_KEY" ]; then
        echo -e "${RED}錯誤: 請設定 CLOUDFLARE_TUNNEL_API_KEY${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 環境變數檢查通過${NC}"
}

# 詢問專案資訊
ask_info() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}   專案設定${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    read -p "專案名稱 (如: kanban): " PROJECT_NAME
    read -p "GitHub 使用者名稱: " GITHUB_USER
    read -p "Vultr 區域 (預設 nrt): " REGION
    read -p "Vultr 方案 (預設 vc2-1c-1gb): " PLAN
    read -p "子網域前綴 (如: kanban): " SUBDOMAIN
    read -p "Cloudflare 網域: " DOMAIN
    read -p "Cloudflare Zone ID: " ZONE_ID
    
    REGION=${REGION:-nrt}
    PLAN=${PLAN:-vc2-1c-1gb}
    PROJECT_NAME=${PROJECT_NAME:-kanban}
}

# 建立 Vultr 伺服器
create_server() {
    echo -e "${YELLOW}建立 Vultr 伺服器...${NC}"
    
    RESPONSE=$(curl -s -X POST "https://api.vultr.com/v2/instances" \
        -H "Authorization: Bearer $VULTR_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"region\": \"$REGION\",
            \"plan\": \"$PLAN\",
            \"label\": \"$PROJECT_NAME\",
            \"image_id\": \"docker\"
        }")
    
    INSTANCE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo -e "${GREEN}伺服器建立中 (ID: $INSTANCE_ID)${NC}"
    echo "等待伺服器上線..."
    
    # 等待伺服器上線
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
    
    echo -e "${GREEN}✓ 伺服器上線: $SERVER_IP${NC}"
}

# 部署到伺服器
deploy() {
    echo -e "${YELLOW}部署到伺服器...${NC}"
    
    # 安裝必要工具
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "apt update && apt install -y git docker-compose" || true
    
    # Clone repo
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "cd /root && rm -rf $PROJECT_NAME"
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "cd /root && git clone https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$PROJECT_NAME.git"
    
    # Build & Run
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "cd /root/$PROJECT_NAME && docker build -t $PROJECT_NAME-app ."
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "docker rm -f $PROJECT_NAME 2>/dev/null || true"
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "docker run -d -p 3000:3000 --name $PROJECT_NAME $PROJECT_NAME-app"
    
    echo -e "${GREEN}✓ 部署完成${NC}"
}

# 設定 Cloudflare DNS
setup_dns() {
    echo -e "${YELLOW}設定 Cloudflare DNS...${NC}"
    
    # 取得 current tunnel URL
    TUNNEL_URL=$(sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "cloudflared tunnel --url http://localhost:3000 2>&1" | grep "https://" | head -1 | awk '{print $NF}')
    
    # 建立 DNS
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CLOUDFLARE_TUNNEL_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"CNAME\",
            \"name\": \"$SUBDOMAIN\",
            \"content\": \"$TUNNEL_URL\",
            \"proxied\": true
        }"
    
    echo -e "${GREEN}✓ DNS 設定完成${NC}"
    echo -e "${GREEN}網址: https://$SUBDOMAIN.$DOMAIN${NC}"
}

# 主流程
main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Kanban Board 部署精靈${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    check_env
    ask_info
    
    # 這裡需要輸入伺服器密碼
    read -p "伺服器 root 密碼: " -s SERVER_PASSWORD
    echo
    
    create_server
    deploy
    setup_dns
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   部署完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "網址: https://$SUBDOMAIN.$DOMAIN"
    echo "伺服器: $SERVER_IP"
}

# 執行
main
