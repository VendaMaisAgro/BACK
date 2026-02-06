# Configurações de Limpeza Automática no EC2

Este guia mostra como configurar limpeza automática periódica no EC2 para **prevenir o disco cheio**.

## 📋 Pré-requisitos

- Acesso SSH ao EC2
- Usuário com permissões `sudo`
- Scripts de cleanup já presentes em `/home/ubuntu/BACK/scripts/`

---

## 1️⃣ Configurar Cron Job para Limpeza Semanal

Execute no EC2:

```bash
# Editar crontab do usuário ubuntu
crontab -e

# Adicionar esta linha no final do arquivo:
0 2 * * 0 /home/ubuntu/BACK/scripts/cleanup-ec2.sh >> /var/log/docker-cleanup.log 2>&1
```

**O que faz**: Executa `cleanup-ec2.sh` todo **domingo às 2h da manhã**.

**Verificar se foi configurado**:
```bash
crontab -l
```

**Visualizar logs de limpeza**:
```bash
tail -f /var/log/docker-cleanup.log
```

---

## 2️⃣ Configurar Rotação Automática de Logs (Journald)

Limitar o tamanho dos logs do sistema:

```bash
# Criar diretório de configuração
sudo mkdir -p /etc/systemd/journald.conf.d

# Criar arquivo de configuração
sudo tee /etc/systemd/journald.conf.d/size-limit.conf << 'EOF'
[Journal]
SystemMaxUse=100M
RuntimeMaxUse=50M
MaxRetentionSec=7day
EOF

# Aplicar configuração
sudo systemctl restart systemd-journald

# Limpar logs antigos imediatamente
sudo journalctl --vacuum-size=100M
```

**O que faz**:
- Limita logs do sistema a **100MB**
- Limita logs em memória a **50MB**  
- Remove logs com mais de **7 dias**

**Verificar**:
```bash
sudo journalctl --disk-usage
```

---

## 3️⃣ Configurar Rotação de Logs do Docker

Limitar tamanho dos logs dos containers:

```bash
# Criar arquivo de configuração do Docker daemon
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Reiniciar Docker
sudo systemctl restart docker

# Reiniciar aplicação
cd /home/ubuntu/BACK
docker compose -f docker-compose.prod.yml up -d
```

**O que faz**: Cada container terá no máximo **3 arquivos de log de 10MB** (~30MB total por container).

---

## 4️⃣ Criar SWAP (Memória Virtual)

Se o SWAP não existir, criar 2GB:

```bash
# Verificar se já existe
swapon --show

# Se não existir, criar
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente (sobrevive a reboot)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verificar
free -h
```

**Benefício**: Reduz chance de "out of memory" durante deploys pesados.

---

## 5️⃣ Monitoramento Contínuo

Criar script de monitoramento em `/home/ubuntu/monitor-disk.sh`:

```bash
#!/usr/bin/env bash
# Script de monitoramento simples

USED=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$USED" -gt 80 ]; then
    echo "$(date): ALERTA! Disco em ${USED}%" >> /var/log/disk-monitor.log
    # Executar limpeza automática
    /home/ubuntu/BACK/scripts/cleanup-ec2.sh >> /var/log/disk-monitor.log 2>&1
fi
```

Tornar executável e agendar para rodar a cada 6 horas:

```bash
chmod +x /home/ubuntu/monitor-disk.sh

# Adicionar ao cron
crontab -e

# Adicionar linha:
0 */6 * * * /home/ubuntu/monitor-disk.sh
```

---

## ✅ Verificação Final

Execute estes comandos no EC2 para confirmar tudo:

```bash
# 1. Verificar cron jobs
crontab -l

# 2. Verificar limite de logs
sudo journalctl --disk-usage

# 3. Verificar configuração Docker
sudo cat /etc/docker/daemon.json

# 4. Verificar SWAP
swapon --show
free -h

# 5. Verificar espaço em disco
df -h /
docker system df
```

---

## 📊 Economia Esperada

| Configuração | Economia/Prevenção |
|--------------|-------------------|
| Cron semanal | Evita acúmulo de 10-20GB |
| Rotação journald | Limita a 100MB (era ilimitado) |
| Rotação logs Docker | ~30MB por container |
| SWAP 2GB | Evita crashes por memória |

---

## 🚨 Em Caso de Emergência

Se o disco já está cheio (>90%):

```bash
cd /home/ubuntu/BACK
./scripts/emergency-disk-cleanup.sh
```

**ATENÇÃO**: Isso remove TUDO do Docker. Será necessário re-deploy após.

---

## 📌 Manutenção Recomendada

- **Diário**: Verificar `df -h /` (automático via monitor)
- **Semanal**: Revisar `/var/log/docker-cleanup.log`
- **Mensal**: Executar `disk-diagnostics.sh` para análise completa
- **Trimestral**: Considerar aumentar EBS se uso constante >70%
