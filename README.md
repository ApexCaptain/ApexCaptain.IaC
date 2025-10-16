# ApexCaptain.IaC - Infrastructure as Code

## 📋 프로젝트 개요

OCI 기반의 멀티 클러스터 Kubernetes 환경을 CDK for Terraform(CDKTF)을 사용하여 관리하는 IaC 프로젝트입니다.

### 🎯 주요 목표

- **멀티 클러스터 Kubernetes 환경** 구축 및 관리
  - Oracle Cloud OKE 클러스터 (클라우드)
  - On-premise Workstation 클러스터
- **GitOps 기반 배포 파이프라인** 구현
- **개인 미디어 서버 & 게임 서버 인프라**
- **보안 및 모니터링** 체계 구축
- **클라우드 네이티브 개발 환경** 제공

---

## 🏗️ 기술 스택

### 핵심 기술

- **CDK for Terraform (CDKTF)** - TypeScript 기반 인프라 정의
- **Oracle Cloud Infrastructure (OCI)** - 클라우드 플랫폼
- **Kubernetes** - 컨테이너 오케스트레이션
- **Istio** - 서비스 메시
- **ArgoCD** - GitOps 배포 관리 (구현 완료)
- **Longhorn** - 분산 스토리지 시스템
- **MetalLB** - 로드 밸런서

### 개발 도구

- **TypeScript** - 메인 개발 언어
- **NestJS** - 애플리케이션 프레임워크
- **Projen** - 프로젝트 자동화 도구
- **ESLint + Prettier** - 코드 품질 관리
- **Yarn** - 패키지 관리
- **Context7** - MCP 서버 통합

---

## 📁 프로젝트 구조

```
ApexCaptain.IaC/
├── 📁 src/                          # 소스 코드
│   ├── 📁 terraform/               # CDKTF 인프라 정의
│   │   ├── 📁 stacks/              # 인프라 스택들
│   │   │   ├── 📁 k8s/            # Kubernetes 관련 스택
│   │   │   │   ├── 📁 oke/        # Oracle Kubernetes Engine (클라우드)
│   │   │   │   │   ├── 📁 apps/   # 애플리케이션
│   │   │   │   │   │   ├── argo-cd.stack.ts
│   │   │   │   │   │   ├── cert-manager.stack.ts
│   │   │   │   │   │   ├── cloudbeaver.stack.ts
│   │   │   │   │   │   ├── dashboard.stack.ts
│   │   │   │   │   │   ├── git-ops.stack.ts
│   │   │   │   │   │   ├── home-l2tp-vpn-proxy.stack.ts
│   │   │   │   │   │   ├── ingress-controller.stack.ts
│   │   │   │   │   │   ├── istio.stack.ts
│   │   │   │   │   │   ├── monitoring.stack.ts
│   │   │   │   │   │   ├── nfs.stack.ts
│   │   │   │   │   │   ├── oauth2-proxy.stack.ts
│   │   │   │   │   │   ├── redis-ui.stack.ts
│   │   │   │   │   │   └── vault.stack.ts
│   │   │   │   │   ├── cluster.stack.ts
│   │   │   │   │   ├── network.stack.ts
│   │   │   │   │   ├── bastion.stack.ts
│   │   │   │   │   ├── compartment.stack.ts
│   │   │   │   │   ├── endpoint.stack.ts
│   │   │   │   │   ├── policy.stack.ts
│   │   │   │   │   └── system.stack.ts
│   │   │   │   └── 📁 workstation/ # On-premise Workstation
│   │   │   │       ├── 📁 apps/   # 개인/미디어/게임 서비스
│   │   │   │       │   ├── cert-manager.stack.ts
│   │   │   │       │   ├── dashboard.stack.ts
│   │   │   │       │   ├── game.7dtd.stack.ts
│   │   │   │       │   ├── game.sftp.stack.ts
│   │   │   │       │   ├── git-ops.stack.ts
│   │   │   │       │   ├── ingress-controller.stack.ts
│   │   │   │       │   ├── istio.stack.ts
│   │   │   │       │   ├── longhorn.stack.ts
│   │   │   │       │   ├── metallb.stack.ts
│   │   │   │       │   ├── monitoring.stack.ts
│   │   │   │       │   ├── nas.jellyfin.stack.ts
│   │   │   │       │   ├── nas.qbittorrent.stack.ts
│   │   │   │       │   ├── nas.sftp.stack.ts
│   │   │   │       │   └── windows.stack.ts
│   │   │   │       ├── 📁 dev-pods/ # 개발 환경 Pod
│   │   │   │       │   └── apex-captain.stack.ts
│   │   │   │       ├── system.stack.ts
│   │   │   │       └── node-meta.stack.ts
│   │   │   ├── 📁 cloudflare/      # DNS 및 CDN 설정
│   │   │   │   ├── firewall.stack.ts
│   │   │   │   ├── record.stack.ts
│   │   │   │   └── zone.stack.ts
│   │   │   ├── 📁 project/         # 프로젝트 공통 설정
│   │   │   │   ├── 📁 apps/       # 애플리케이션
│   │   │   │   │   └── number-planet.stack.ts
│   │   │   │   ├── github-io.stack.ts
│   │   │   │   └── profile.stack.ts
│   │   │   ├── ocir.stack.ts      # Oracle Container Image Registry
│   │   │   ├── git-ops.stack.ts   # GitOps 관리 스택
│   │   │   └── project.stack.ts   # 프로젝트 메인 스택
│   │   ├── terraform.module.ts
│   │   └── terraform.config.service.ts
│   ├── 📁 common/                  # 공통 유틸리티
│   ├── 📁 global/                  # 글로벌 설정
│   └── main.ts                     # 진입점
├── 📁 scripts/                     # 자동화 스크립트
│   ├── backup-tfstate.script.ts    # Terraform 상태 백업
│   ├── tf-deploy-selection.script.ts # 선택적 배포
│   ├── terminal-v2.script.ts       # 대화형 터미널 도구 v2
│   ├── create-random-string.script.ts
│   ├── 📁 terminal/               # 터미널 도구
│   ├── 📁 external/               # 외부 스크립트
│   ├── 📁 generated/              # 생성된 스크립트
│   └── 📁 stage/                  # 단계별 스크립트
├── 📁 assets/                      # 정적 자산
│   ├── 📁 static/                 # 정적 파일
│   │   ├── 7dtd.install-additional-mods.js
│   │   ├── home-l2tp-vpn-proxy.startup.sh
│   │   └── 📁 windows/           # Windows 관련 스크립트
│   └── 📁 templates/              # 템플릿 파일
├── 📁 .projen/                     # Projen 생성 파일
├── 📁 .github/                     # GitHub Actions
├── 📁 .devcontainer/              # 개발 컨테이너 설정
├── 📁 .cursor/                     # Cursor MCP 설정
├── 📁 keys/                        # 인증 키 파일
├── 📁 env/                         # 환경 변수
├── 📁 .secrets/                    # 시크릿 파일 (gitignore)
└── 📁 tmp/                         # 임시 파일
```

---

## 🚀 주요 기능

### 1. 하이브리드 멀티 클러스터 Kubernetes 환경

- **Oracle Kubernetes Engine (OKE)** 클러스터 자동 프로비저닝 (클라우드)
- **On-premise Workstation 클러스터** On-Premise로 구축 (로컬 환경)
- **Istio 서비스 메시** 구축으로 서비스 간 통신 관리
- **하이브리드 멀티 클러스터 통신** 설정 (진행 중)

### 2. 보안 및 인증

- **Vault** - 시크릿 관리 시스템 (개발 중)
- **OAuth2 Proxy** - 인증 프록시 (구현 완료)
- **Cert-Manager** - SSL 인증서 자동 관리 (구현 완료)
- **Bastion 호스트** - 보안 접근 제어

### 3. 모니터링 및 관찰성

- **Prometheus + Grafana** - 메트릭 수집 및 시각화 (개발 중)

### 4. DevOps 도구

- **ArgoCD** - GitOps 기반 배포 관리 (구현 완료)
- **OCIR** - Oracle Container Image Registry 통합 (구현 완료)
- **GitOps 파이프라인** - 자동화된 CI/CD 워크플로우 (구현 완료)
- **CloudBeaver** - 데이터베이스 관리 도구 (구현 완료)
- **Redis UI** - Redis 관리 인터페이스 (구현 완료)
- **Home L2TP VPN Proxy** - 원격 네트워크 접근 프록시 (구현 완료)

### 5. 개인 미디어 서버 인프라 (On-premise)

- **Jellyfin** - 미디어 스트리밍 서버 (구현 완료)
- **qBittorrent** - 토렌트 다운로드 관리 (구현 완료)
- **7 Days to Die** - 게임 서버 (구현 완료)
- **SFTP 서버** - 파일 전송 서비스 (구현 완료)
- **Longhorn Storage** - 분산 스토리지 시스템 (구현 완료)

---

## 🎮 배포된 애플리케이션 목록

### Oracle Cloud OKE 클러스터 (클라우드)

#### 시스템 애플리케이션

- **Istio Service Mesh** - 서비스 간 통신 관리 (개발 중)
- **ArgoCD** - GitOps 배포 관리 (구현 완료)
- **Vault** - 시크릿 관리 시스템 (개발 중)
- **Prometheus + Grafana** - 모니터링 및 메트릭 수집 (구현 완료)
- **Cert-Manager** - SSL 인증서 자동 관리 (구현 완료)
- **Ingress Controller** - 트래픽 라우팅 (구현 완료)

#### 일반 애플리케이션

- **Number Planet** - 웹 애플리케이션 (구현 완료)
- **CloudBeaver** - 데이터베이스 관리 도구
- **Redis UI** - Redis 관리 인터페이스
- **OAuth2 Proxy** - 인증 프록시
- **Home L2TP VPN Proxy** - 원격 네트워크 접근 프록시
- **NFS Server** - 네트워크 파일 시스템
- **Kubernetes Dashboard** - 클러스터 관리 UI

### On-premise Workstation 클러스터

#### 시스템 애플리케이션

- **Istio Service Mesh** - 서비스 간 통신 관리 (개발 중)
- **Longhorn Storage** - 분산 스토리지 시스템 (구현 완료)
- **MetalLB Load Balancer** - 로드 밸런싱 (구현 완료)
- **Prometheus + Grafana** - 모니터링 및 메트릭 수집 (개발 중)
- **Cert-Manager** - SSL 인증서 자동 관리 (구현 완료)
- **Ingress Controller** - 트래픽 라우팅 (구현 완료)

#### 미디어 및 게임 서버

- **Jellyfin** - 미디어 스트리밍 서버 (구현 완료)
- **qBittorrent** - 토렌트 다운로드 관리 (구현 완료)
- **7 Days to Die** - 게임 서버 (구현 완료)
- **Game SFTP Server** - 게임 파일 전송 서비스 (구현 완료)
- **NAS SFTP Server** - NAS 파일 전송 서비스 (구현 완료)

#### 개발 도구 & 기타

- **Kubernetes Dashboard** - 클러스터 관리 UI (구현 완료)
- **Development Pods** - 개발 환경 컨테이너 (ApexCaptain) (구현 완료)
- **Windows Desktop** - 원격 Windows 데스크톱 환경 (구현 완료)

---

## 🔧 인프라 아키텍처

### 네트워크 구성

```
OCI VCN
├── Public Subnet (Bastion, Load Balancer)
├── Private Subnet (Kubernetes Nodes)
```

### 하이브리드 Kubernetes 클러스터 구성

```
Oracle Cloud OKE Cluster (클라우드)
├── Infrastructure Layer
│   ├── Compartment (구현 완료)
│   ├── Network (VCN, Subnets, Security Lists) (구현 완료)
│   ├── Bastion Host (구현 완료)
│   ├── Policy & IAM (구현 완료)
│   └── Cluster Endpoint (구현 완료)
├── System Namespace
│   ├── Istio Control Plane (개발 중)
│   ├── ArgoCD (구현 완료)
│   ├── Vault (개발 중)
│   ├── Monitoring Stack (Prometheus/Grafana) (구현 완료)
│   ├── Cert-Manager (구현 완료)
│   └── Ingress Controller (구현 완료)
├── Application Namespace
│   ├── Number Planet (구현 완료)
│   ├── CloudBeaver (구현 완료)
│   ├── Redis UI (구현 완료)
│   ├── OAuth2 Proxy (구현 완료)
│   ├── Home L2TP VPN Proxy (구현 완료)
│   ├── NFS Server (구현 완료)
│   └── Kubernetes Dashboard (구현 완료)
└── GitOps Layer
    └── ArgoCD Applications (구현 완료)

On-premise Workstation Cluster
├── Infrastructure Layer
│   ├── Node Metadata (구현 완료)
│   ├── Longhorn Storage (HDD + SSD) (구현 완료)
│   └── MetalLB Load Balancer (구현 완료)
├── System Namespace
│   ├── Istio Control Plane (개발 중)
│   ├── Monitoring Stack (Prometheus/Grafana) (구현 완료)
│   ├── Cert-Manager (구현 완료)
│   └── Ingress Controller (구현 완료)
├── Application Namespace
│   ├── Media Services
│   │   ├── Jellyfin (구현 완료)
│   │   └── qBittorrent (구현 완료)
│   ├── Game Services
│   │   ├── 7 Days to Die (구현 완료)
│   │   └── Game SFTP (구현 완료)
│   ├── File Services
│   │   └── NAS SFTP (구현 완료)
│   └── Kubernetes Dashboard (구현 완료)
├── Development Namespace
│   ├── Windows Desktop (구현 완료)
│   └── Dev Pods (ApexCaptain) (구현 완료)
└── GitOps Layer
    └── ArgoCD Applications (구현 완료)
```

## 🎯 핵심 성과

### 1. 인프라 자동화

- **100% 코드 기반 인프라** 관리 (TypeScript + CDKTF)
- **GitOps 워크플로우** 구현으로 배포 자동화 (ArgoCD 기반)
- **멀티 클러스터** 환경 구축 (OKE + Workstation)
- **선택적 배포 시스템** 구현 (대화형 터미널 도구)
- **Terraform 상태 자동 백업** 시스템

### 2. 보안 강화

- **Zero Trust 네트워크** 아키텍처 구현
- **OAuth2 기반 인증** 프록시 (GitHub OAuth)
- **SSL/TLS 인증서** 자동 관리 및 갱신 (Cert-Manager)
- **시크릿 관리** 자동화 (Vault 개발 중)
- **VPN 프록시** 구현 (L2TP/IPsec)

### 3. 운영 효율성

- **분산 스토리지** 시스템 (Longhorn - HDD/SSD 하이브리드)
- **로드 밸런싱** (MetalLB)
- **모니터링 대시보드** 구축 (Prometheus/Grafana 개발 중)
- **백업 및 복구** 자동화
- **미디어 & 게임 서버** 통합 관리

### 4. 개발자 경험

- **클라우드 네이티브 개발 환경** (Dev Pods)
- **Windows 원격 데스크톱** 환경
- **데이터베이스 관리 도구** (CloudBeaver)
- **MCP 서버 통합** (Context7)

---

## 🛠️ 주요 스크립트

| 스크립트                   | 설명                          |
| -------------------------- | ----------------------------- |
| `yarn projen`              | Projen 설정 재생성            |
| `yarn build`               | 프로젝트 빌드                 |
| `yarn compile`             | TypeScript 컴파일             |
| `yarn tf@build`            | CDKTF 코드 신시사이즈 (synth) |
| `yarn tf@deploy`           | 전체 인프라 배포 (병렬 20)    |
| `yarn tf@deploy:selection` | 선택적 스택 배포 (대화형)     |
| `yarn tf@deploy:single`    | 단일 스택 배포                |
| `yarn tf@plan`             | 배포 계획 확인 (diff)         |
| `yarn tf@install`          | Terraform provider 초기화     |
| `yarn tf@backup`           | tfstate 파일 백업             |
| `yarn tf@clean`            | CDKTF 출력 디렉토리 정리      |
| `yarn terminal`            | 대화형 터미널 도구 v2         |

---

## 🏆 기술적 도전과 해결

### 1. 하이브리드 멀티 클러스터 통신

**도전**: 클라우드(OKE)와 On-premise(Workstation) Kubernetes 클러스터 간 안전한 통신 구축

**해결**:

- Istio 서비스 메시 구현 (개발 중)
- L2TP VPN 프록시를 통한 안전한 네트워크 터널링 (구현 완료)
- ArgoCD를 통한 멀티 클러스터 배포 관리 (구현 완료)

### 2. 스토리지 전략

**도전**: On-premise 환경에서의 효율적인 스토리지 관리

**해결**:

- Longhorn 분산 스토리지 시스템 도입
- HDD/SSD 하이브리드 구성으로 성능과 용량 최적화
- 자동 백업 및 복제 기능 구현

### 3. GitOps 파이프라인

**도전**: 복잡한 멀티 클러스터 환경에서의 일관된 배포 관리

**해결**:

- ArgoCD 기반 GitOps 워크플로우 구축
- 선택적 스택 배포 도구 개발 (대화형 CLI)
- 자동화된 배포 검증 및 롤백 메커니즘

### 4. 상태 관리 및 백업

**도전**: Terraform 상태 파일의 안전한 관리와 버전 관리

**해결**:

- 로컬 백엔드와 자동 백업 스크립트 구현
- 스택별 독립적인 상태 관리
- Git 기반 버전 관리 시스템

### 5. 보안 강화

**도전**: 클라우드 네이티브 환경에서의 종합적 보안 체계 구축

**해결**:

- OAuth2 Proxy를 통한 인증 레이어 (구현 완료)
- Cert-Manager를 통한 자동 SSL/TLS 관리 (구현 완료)
- Bastion 호스트를 통한 안전한 클러스터 접근 (구현 완료)
- Vault 시크릿 관리 시스템 (개발 중)
