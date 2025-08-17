# ApexCaptain.IaC - Infrastructure as Code 포트폴리오

## 📋 프로젝트 개요

**ApexCaptain.IaC**는 Oracle Cloud Infrastructure(OCI) 기반의 클라우드 네이티브 인프라를 CDK for Terraform(CDKTF)을 사용하여 코드로 관리하는 Infrastructure as Code 프로젝트입니다.

### 🎯 주요 목표

- **하이브리드 멀티 클러스터 Kubernetes 환경** 구축 및 관리
  - Oracle Cloud OKE 클러스터 (클라우드)
  - On-premise Workstation 클러스터 (kubeadm 기반)
- **GitOps 기반 배포 파이프라인** 구현
- **개인 미디어 서버 인프라**
- **보안 및 모니터링** 체계 구축

---

## 🏗️ 기술 스택

### 핵심 기술

- **CDK for Terraform (CDKTF)** - TypeScript 기반 인프라 정의
- **Oracle Cloud Infrastructure (OCI)** - 클라우드 플랫폼
- **Kubernetes** - 컨테이너 오케스트레이션
- **Istio** - 서비스 메시
- **ArgoCD** - GitOps 배포 관리 (개발 중)

### 개발 도구

- **TypeScript** - 메인 개발 언어
- **Projen** - 프로젝트 자동화 도구
- **ESLint + Prettier** - 코드 품질 관리
- **Yarn** - 패키지 관리

---

## 📁 프로젝트 구조

```
ApexCaptain.IaC/
├── 📁 src/                          # 소스 코드
│   ├── 📁 terraform/               # CDKTF 인프라 정의
│   │   ├── 📁 stacks/              # 인프라 스택들
│   │   │   ├── 📁 k8s/            # Kubernetes 관련 스택
│   │   │   │   ├── 📁 oke/        # Oracle Kubernetes Engine (클라우드)
│   │   │   │   │   ├── 📁 apps/   # 비즈니스 애플리케이션
│   │   │   │   │   ├── cluster.stack.ts
│   │   │   │   │   ├── network.stack.ts
│   │   │   │   │   ├── bastion.stack.ts
│   │   │   │   │   └── system.stack.ts
│   │   │   │   └── 📁 workstation/ # On-premise Workstation (kubeadm)
│   │   │   │       ├── 📁 apps/   # 개인/미디어 서비스
│   │   │   │       ├── 📁 dev-pods/ # 개발 환경
│   │   │   │       └── system.stack.ts
│   │   │   ├── 📁 cloudflare/      # DNS 및 CDN 설정
│   │   │   └── 📁 project/         # 프로젝트 공통 설정
│   │   ├── terraform.module.ts
│   │   └── terraform.config.service.ts
│   ├── 📁 common/                  # 공통 유틸리티
│   ├── 📁 global/                  # 글로벌 설정
│   └── main.ts                     # 진입점
├── 📁 scripts/                     # 자동화 스크립트
│   ├── backup-tfstate.script.ts    # Terraform 상태 백업
│   ├── tf-deploy-selection.script.ts # 선택적 배포
│   └── 📁 terminal/               # 터미널 도구
├── 📁 .projen/                     # Projen 생성 파일
├── 📁 .github/                     # GitHub Actions
├── 📁 .devcontainer/              # 개발 컨테이너 설정
├── 📁 keys/                       # 인증 키 파일
├── 📁 env/                        # 환경 변수
└── 📁 assets/                     # 정적 자산
```

---

## 🚀 주요 기능

### 1. 하이브리드 멀티 클러스터 Kubernetes 환경

- **Oracle Kubernetes Engine (OKE)** 클러스터 자동 프로비저닝 (클라우드)
- **On-premise Workstation 클러스터** kubeadm 기반 구축 (로컬 환경)
- **Istio 서비스 메시** 구축으로 서비스 간 통신 관리
- **하이브리드 멀티 클러스터 통신** 설정 (진행 중)

### 2. 보안 및 인증

- **Vault** - 시크릿 관리 시스템 (개발 중)
- **OAuth2 Proxy** - 인증 프록시
- **Cert-Manager** - SSL 인증서 자동 관리
- **Bastion 호스트** - 보안 접근 제어

### 3. 모니터링 및 관찰성

- **Prometheus + Grafana** - 메트릭 수집 및 시각화 (개발 중)

### 4. DevOps 도구

- **ArgoCD** - GitOps 기반 배포 관리 (개발 중)
- **CloudBeaver** - 데이터베이스 관리 도구
- **Redis UI** - Redis 관리 인터페이스

### 5. 개인 미디어 서버 인프라 (On-premise)

- **Jellyfin** - 미디어 스트리밍 서버
- **qBittorrent** - 토렌트 다운로드 관리
- **7 Days to Die** - 게임 서버
- **SFTP 서버** - 파일 전송 서비스

---

## 🔧 인프라 아키텍처

### 네트워크 구성

```
OCI VCN
├── Public Subnet (Bastion, Load Balancer)
├── Private Subnet (Kubernetes Nodes)
└── Database Subnet (RDS, Redis)
```

### 하이브리드 Kubernetes 클러스터 구성

```
Oracle Cloud OKE Cluster (클라우드)
├── System Namespace
│   ├── Istio Control Plane
│   ├── ArgoCD (개발 중)
│   ├── Vault (개발 중)
│   └── Monitoring Stack (개발 중)
├── Application Namespace
│   ├── Docent AI Engine
│   ├── Docent AI Web
│   └── Business Applications
└── Ingress Controller

On-premise Workstation Cluster (kubeadm 기반)
├── System Namespace
│   ├── Istio Control Plane
│   ├── Local Development Tools
│   ├── Monitoring Stack
│   └── Longhorn Storage
├── Application Namespace
│   ├── Development Applications
│   ├── Testing Workloads
│   ├── Media Services (Jellyfin, qBittorrent)
│   ├── Game Servers (7 Days to Die)
│   └── File Services (SFTP, NAS)
└── Local Ingress Controller
```

---

## 📊 프로젝트 통계

- **총 코드 라인**: 15,000+ 라인
- **TypeScript 파일**: 50+ 개
- **Terraform 스택**: 20+ 개
- **배포된 애플리케이션**: 20+ 개 (일부 개발 중)
- **자동화 스크립트**: 10+ 개
- **개발 진행률**: 약 70% 완료

---

## 🎯 핵심 성과

### 1. 인프라 자동화

- **100% 코드 기반 인프라** 관리
- **GitOps 워크플로우** 구현으로 배포 자동화 (진행 중)
- **멀티 환경 지원** (클라우드/On-premise)

### 2. 보안 강화

- **Zero Trust 네트워크** 아키텍처 구현
- **시크릿 관리** 자동화 (Vault 개발 중)
- **SSL 인증서** 자동 갱신

### 3. 운영 효율성

- **모니터링 대시보드** 구축 (Prometheus/Grafana 개발 중)
- **로그 중앙화** 시스템 (계획 중)
- **백업 및 복구** 자동화
- **미디어 서비스** 자동화 (Jellyfin, qBittorrent)

---

## 🔄 개발 워크플로우

### 1. 코드 작성

```bash
# 개발 환경 설정
yarn install
yarn watch

# 인프라 코드 작성
# src/terraform/stacks/ 에서 스택 정의
```

### 2. 배포 프로세스

```bash
# 인프라 계획
yarn tf@plan

# 선택적 배포
yarn tf@deploy:selection

# 전체 배포
yarn tf@deploy
```

### 3. 상태 관리

```bash
# 상태 백업
yarn tf@backup

# 상태 정리
yarn tf@clean
```

---

## 🛠️ 주요 스크립트

| 스크립트                   | 설명                |
| -------------------------- | ------------------- |
| `yarn tf@deploy`           | 전체 인프라 배포    |
| `yarn tf@deploy:selection` | 선택적 스택 배포    |
| `yarn tf@plan`             | 배포 계획 확인      |
| `yarn tf@backup`           | Terraform 상태 백업 |
| `yarn terminal`            | 대화형 터미널 도구  |

---

## 📈 향후 계획

### 단기 목표 (1-3개월)

- [ ] **ArgoCD 완성**: GitOps 배포 파이프라인 구축 완료
- [ ] **Vault 완성**: 시크릿 관리 시스템 구축 완료
- [ ] **Prometheus/Grafana 완성**: 모니터링 시스템 구축 완료

### 중기 목표 (3-6개월)

- [ ] **하이브리드 멀티 클러스터 통신**: OKE와 Workstation 클러스터 간 Istio 연결
- [ ] **모니터링 고도화**: ELK 스택 추가 및 Kiali 활성화
- [ ] **Authentik**: 통합 인증 시스템 구축
- [ ] **Palworld 게임 서버**: 추가 게임 서버 구축

### 장기 목표 (6개월+)

- [ ] **멀티 클라우드 지원**: AWS, Azure 추가
- [ ] **서버리스 아키텍처**: FaaS 도입
- [ ] **AI/ML 파이프라인**: 머신러닝 워크로드 지원

---

## 🏆 기술적 도전과 해결

### 1. 하이브리드 멀티 클러스터 통신

**도전**: 클라우드(OKE)와 On-premise(Workstation) Kubernetes 클러스터 간 안전한 통신 구축
**해결**: Istio 서비스 메시와 전용 네트워크 구성으로 해결 (진행 중)

### 2. 상태 관리

**도전**: Terraform 상태 파일의 안전한 관리
**해결**: 자동화된 백업 스크립트와 원격 상태 저장소 구현

### 3. 보안 강화

**도전**: 클라우드 네이티브 환경에서의 보안 강화
**해결**: Vault, OAuth2 Proxy, Cert-Manager를 통한 종합적 보안 체계 구축 (진행 중)

---
