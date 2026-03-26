FROM node:22.12.0

WORKDIR /usr/src/app

COPY package.json ./

RUN npm config set registry https://registry.npmmirror.com

RUN npm install

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-noto \
    fonts-wqy-microhei \
    fonts-noto-cjk \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libxshmfence1 \
    libx11-dev \
    libxext-dev \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY . .

EXPOSE 3030

CMD ["node", "app/server.js"]