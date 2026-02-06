# EC2 Deployment Scripts

Conjunto de scripts para facilitar o deploy e manutenção da aplicação VendaMais Agro no EC2.

## 📂 Scripts Disponíveis

### 🧹 cleanup-ec2.sh

Script completo de limpeza para EC2. **Execute este script se o deploy estiver falhando por falta de espaço em disco.**

**O que faz:**
- Para containers Docker
- Remove imagens, containers e volumes não utilizados
- Limpa logs do sistema (journalctl)
- Limpa cache do APT
- Remove arquivos de log antigos
- Cria SWAP de 2GB (se não existir)

**Como executar no EC2:**
```bash
cd /home/ubuntu/BACK
bash scripts/cleanup-ec2.sh
```

**Quando executar:**
- Deploy falhando com erro `no space left on device`
- Disco com mais de 80% de uso
- Manutenção preventiva (mensal)

---

### 🚨 emergency-disk-cleanup.sh

Script de **EMERGÊNCIA** para casos críticos de disco 100% cheio.

**⚠️ ATENÇÃO:** Remove TUDO do Docker (imagens, containers, volumes). Use apenas em caso de extrema necessidade.

**Como executar no EC2:**
```bash
cd /home/ubuntu/BACK
bash scripts/emergency-disk-cleanup.sh
```

**Após executar**, será necessário re-deploy da aplicação.

---

### 🔍 disk-diagnostics.sh

Script de diagnóstico detalhado para investigar uso de disco.

**O que analisa:**
- Uso geral do disco e inodes
- Imagens, containers e volumes Docker
- Logs do sistema (journalctl)
- Cache NPM e Puppeteer
- Top 20 maiores diretórios
- Status de SWAP

**Como executar no EC2:**
```bash
cd /home/ubuntu/BACK
bash scripts/disk-diagnostics.sh > diagnostico-$(date +%Y%m%d).txt
cat diagnostico-*.txt
```

---

### 🚀 deploy-back.sh

Script de deploy automatizado com limpeza preventiva integrada e verificação de espaço.

**O que faz:**
- **Verifica espaço mínimo (3GB)** - aborta se insuficiente
- Executa **limpeza agressiva** antes do pull (containers, imagens, volumes)
- Faz pull da imagem Docker mais recente
- Executa migrações do Prisma
- Inicia a aplicação
- Limpa recursos não utilizados após deploy

**Como executar no EC2:**
```bash
cd /home/ubuntu/BACK
bash scripts/deploy-back.sh
```

**Variáveis de ambiente (opcionais):**
```bash
APP_DIR=/home/ubuntu/BACK
IMAGE_NAME=ghcr.io/vendamaisagro/back:latest
BRANCH=main
```

**Exemplo com variáveis:**
```bash
IMAGE_NAME=ghcr.io/vendamaisagro/back:dev bash scripts/deploy-back.sh
```

**Novidades (2026-02-06):**
- ✅ Verifica espaço mínimo de 3GB antes de continuar
- ✅ Cleanup agressivo em múltiplas etapas
- ✅ Mostra espaço em GB para melhor visibilidade
- ✅ Mensagens de erro claras com próximos passos

---

## ⚠️ Troubleshooting

### Deploy falhou com "no space left on device"

1. Execute o script de cleanup:
   ```bash
   bash scripts/cleanup-ec2.sh
   ```

2. Verifique o espaço disponível:
   ```bash
   df -h /
   docker system df
   ```

3. Execute o deploy novamente:
   ```bash
   bash scripts/deploy-back.sh
   ```

### Como verificar se a aplicação está rodando

```bash
cd /home/ubuntu/BACK
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

### Como ver logs em tempo real

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

### Como restart manual

```bash
cd /home/ubuntu/BACK
docker compose -f docker-compose.prod.yml restart app
```

---

## 🔒 Requisitos

- Docker e Docker Compose instalados
- Acesso SSH ao servidor EC2
- Permissões para executar comandos Docker
- Arquivo `.env` configurado em `/home/ubuntu/BACK/`

---

## 📊 Monitoramento de Espaço

### Verificar espaço total do disco
```bash
df -h /
```

### Verificar uso do Docker
```bash
docker system df
```

### Verificar uso detalhado do Docker
```bash
docker system df -v
```

---

## 🤖 CI/CD Automático

O deploy também pode ser feito automaticamente via GitHub Actions:

1. Push para a branch `main`
2. Actions executará build e push da imagem
3. Deploy automático no EC2 via SSH

O workflow já inclui:
- ✅ Verificação de espaço em disco
- ✅ Limpeza preventiva antes do pull
- ✅ Limpeza após deploy

---

## 🤖 Configuração Automática (Recomendado)

Para evitar problemas de disco cheio no futuro, configure limpeza automática:

**Ver guia completo**: [`EC2-AUTO-CLEANUP-CONFIG.md`](./EC2-AUTO-CLEANUP-CONFIG.md)

**Quick setup** (executar no EC2):
```bash
# Limpeza semanal automática
crontab -e
# Adicionar: 0 2 * * 0 /home/ubuntu/BACK/scripts/cleanup-ec2.sh >> /var/log/docker-cleanup.log 2>&1

# Limitar logs do sistema
sudo mkdir -p /etc/systemd/journald.conf.d
sudo tee /etc/systemd/journald.conf.d/size-limit.conf << 'EOF'
[Journal]
SystemMaxUse=100M
MaxRetentionSec=7day
EOF
sudo systemctl restart systemd-journald
```

---

## 📝 Notas

- Os scripts são **idempotentes** - podem ser executados múltiplas vezes com segurança
- A limpeza preventiva está integrada no processo de deploy
- O SWAP é criado apenas uma vez, não será recriado
- **RECOMENDADO**: Configurar limpeza automática (ver seção acima)
