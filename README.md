# ApexCaptain.IaC - Infrastructure as Code

## 📋 프로젝트 개요

**ApexCaptain.IaC**는 Oracle Cloud Infrastructure(OCI) 클라우드 및 네이티브 인프라를 CDK for Terraform(CDKTF)을 사용하여 관리하는 IaC 프로젝트입니다.

### 🎯 주요 목표

- **하이브리드 멀티 클러스터 Kubernetes 환경** 구축 및 관리
  - Oracle Cloud OKE 클러스터 (클라우드)
  - On-premise Workstation 클러스터
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
│   │   │   │   │   ├── 📁 apps/   # 비즈니스 애플리케이션
│   │   │   │   │   ├── cluster.stack.ts
│   │   │   │   │   ├── network.stack.ts
│   │   │   │   │   ├── bastion.stack.ts
│   │   │   │   │   └── system.stack.ts
│   │   │   │   └── 📁 workstation/ # On-premise Workstation (microk8s)
│   │   │   │       ├── 📁 apps/   # 개인/미디어 서비스
│   │   │   │       ├── 📁 dev-pods/ # 개발 환경
│   │   │   │       └── system.stack.ts
│   │   │   ├── 📁 cloudflare/      # DNS 및 CDN 설정
│   │   │   ├── 📁 project/         # 프로젝트 공통 설정
│   │   │   │   └── 📁 apps/       # 비즈니스 애플리케이션
│   │   │   │       └── number-planet.stack.ts
│   │   │   ├── 📁 ocir/           # Oracle Container Image Registry
│   │   │   └── 📁 git-ops/        # GitOps 관리 스택
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
- **On-premise Workstation 클러스터** microk8s 기반 구축 (로컬 환경)
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
- **Prometheus + Grafana** - 모니터링 및 메트릭 수집 (개발 중)
- **Cert-Manager** - SSL 인증서 자동 관리 (구현 완료)
- **Ingress Controller** - 트래픽 라우팅 (구현 완료)

#### 비즈니스 애플리케이션

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

- **Jellyfin** - 미디어 스트리밍 서버
- **qBittorrent** - 토렌트 다운로드 관리
- **7 Days to Die** - 게임 서버
- **SFTP Server** - 파일 전송 서비스
- **NAS Server** - 네트워크 연결 스토리지

#### 개발 도구

- **Kubernetes Dashboard** - 클러스터 관리 UI
- **Development Pods** - 개발 환경 컨테이너

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
│   ├── Istio Control Plane (개발 중)
│   ├── ArgoCD (구현 완료)
│   ├── Vault (개발 중)
│   ├── Monitoring Stack (개발 중)
│   └── Home L2TP VPN Proxy (구현 완료)
├── Application Namespace
│   ├── Number Planet (구현 완료)
│   └── Business Applications (구현 완료)
└── Ingress Controller (구현 완료)

On-premise Workstation Cluster (microk8s)
├── System Namespace
│   ├── Istio Control Plane (개발 중)
│   ├── Local Development Tools (구현 완료)
│   ├── Monitoring Stack (개발 중)
│   ├── Longhorn Storage (구현 완료)
│   └── MetalLB Load Balancer (구현 완료)
├── Application Namespace
│   ├── Development Applications (구현 완료)
│   ├── Testing Workloads
│   ├── Media Services (Jellyfin, qBittorrent) (구현 완료)
│   ├── Game Servers (7 Days to Die) (구현 완료)
│   └── File Services (SFTP, NAS) (구현 완료)
└── Local Ingress Controller (구현 완료)
```

---

## 📊 프로젝트 통계

- **총 코드 라인**: 22,246 라인
- **TypeScript 파일**: 129 개
- **Terraform 스택**: 45 개
- **배포된 애플리케이션**: 26+ 개 (일부 개발 중)
- **자동화 스크립트**: 9 개
- **개발 진행률**: 약 70% 완료

---

## 🎉 최근 완성된 기능 (2024년 12월)

### 1. ArgoCD GitOps 파이프라인 완성

- **ArgoCD 설치 및 설정** 완료
- **GitOps 리포지토리** 연동
- **자동화된 배포 파이프라인** 구축
- **ArgoCD 리소스 관리** 스택 구현

### 2. Oracle Container Image Registry (OCIR) 통합

- **OCIR 컨테이너 레포지토리** 생성
- **CI/CD 사용자 계정** 및 권한 관리
- **이미지 풀 시크릿** 자동화
- **GitHub Actions 연동** 설정

### 3. Number Planet 애플리케이션 배포

- **첫 번째 비즈니스 애플리케이션** 성공적 배포
- **GitOps 기반 자동 배포** 파이프라인 구현
- **이미지 업데이트 자동화** (ArgoCD Image Updater)
- **DNS 및 Ingress** 자동 설정

### 4. 완전한 GitOps 워크플로우

- **코드 → 빌드 → 배포** 전체 파이프라인 자동화
- **ArgoCD 애플리케이션** 자동 생성 및 관리
- **환경별 설정** 분리 및 관리
- **롤백 및 자동 복구** 기능

---

## 🎯 핵심 성과

### 1. 인프라 자동화

- **100% 코드 기반 인프라** 관리
- **GitOps 워크플로우** 구현으로 배포 자동화 (구현 완료)
- **멀티 환경 지원** (클라우드/On-premise)

### 2. 보안 강화

- **Zero Trust 네트워크** 아키텍처 구현
- **시크릿 관리** 자동화 (Vault 개발 중)
- **SSL 인증서** 자동 갱신

### 3. 운영 효율성

- **모니터링 대시보드** 구축 (Prometheus/Grafana 개발 중)
- **로그 중앙화** 시스템 (계획 중)
- **백업 및 복구** 자동화 (구현 완료)
- **미디어 서비스** 자동화 (Jellyfin, qBittorrent 구현 완료)

---

## 🔄 개발 워크플로우

### 1. 코드 작성

```bash
# 개발 환경 설정
yarn projen
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
| `yarn tf@deploy:single`    | 단일 스택 배포      |
| `yarn tf@plan`             | 배포 계획 확인      |
| `yarn tf@backup`           | Terraform 상태 백업 |
| `yarn tf@install`          | Terraform 초기화    |
| `yarn tf@clean`            | CDKTF 출력 정리     |
| `yarn terminal`            | 대화형 터미널 도구  |

---

## 📈 향후 계획

### 단기 목표 (1-3개월)

- [x] **ArgoCD 완성**: GitOps 배포 파이프라인 구축 완료
- [x] **OCIR 통합**: Oracle Container Image Registry 통합 완료
- [x] **Number Planet 배포**: 첫 번째 비즈니스 애플리케이션 배포 완료
- [ ] **Vault 완성**: 시크릿 관리 시스템 구축 완료
- [ ] **Prometheus/Grafana 완성**: 모니터링 시스템 구축 완료
- [ ] **Istio Service Mesh**: 서비스 메시 구축 완료
- [ ] **하이브리드 멀티 클러스터 통신**: OKE와 Workstation 클러스터 간 Istio 연결 완료

### 중기 목표 (3-6개월)

- [ ] **모니터링 고도화**: ELK 스택 추가 및 Kiali 활성화
- [ ] **Authentik**: 통합 인증 시스템 구축
- [ ] **Palworld 게임 서버**: 추가 게임 서버 구축
- [ ] **개발 환경 고도화**: 추가 개발 도구 및 서비스 통합

### 장기 목표 (6개월+)

- [ ] **멀티 클라우드 지원**: AWS, Azure 추가
- [ ] **서버리스 아키텍처**: FaaS 도입
- [ ] **AI/ML 파이프라인**: 머신러닝 워크로드 지원

---

## 🏆 기술적 도전과 해결

### 1. 하이브리드 멀티 클러스터 통신

**도전**: 클라우드(OKE)와 On-premise(Workstation) Kubernetes 클러스터 간 안전한 통신 구축
**해결**: Istio 서비스 메시와 전용 네트워크 구성으로 해결 (개발 중)

### 2. Kubernetes 클러스터 마이그레이션

**도전**: microk8s에서 kubeadm으로의 안전한 마이그레이션
**해결**: 단계적 마이그레이션 계획 수립 및 자동화 스크립트 개발 (계획 중)

### 3. 상태 관리

**도전**: Terraform 상태 파일의 안전한 관리
**해결**: 자동화된 백업 스크립트와 원격 상태 저장소 구현

### 4. 보안 강화

**도전**: 클라우드 네이티브 환경에서의 보안 강화
**해결**: Vault, OAuth2 Proxy, Cert-Manager를 통한 종합적 보안 체계 구축 (개발 중)

---
