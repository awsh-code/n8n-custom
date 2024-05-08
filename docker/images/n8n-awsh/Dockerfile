FROM docker.n8n.io/n8nio/n8n:latest
USER root

RUN npm install -g selenium-webdriver puppeteer

RUN cd /usr/local/lib/node_modules/n8n && npm install n8n-nodes-puppeteer


