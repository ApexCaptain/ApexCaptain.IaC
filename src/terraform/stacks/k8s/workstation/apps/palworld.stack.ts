import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import path from 'path';
import _ from 'lodash';
import { CronTime } from 'cron-time-generator';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { Service } from '@lib/terraform/providers/kubernetes/service';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { File } from '@lib/terraform/providers/local/file';
/**
 * @see https://palworld-server-docker.loef.dev/ko
 */
@Injectable()
export class K8S_Workstation_Apps_Palworld_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.palworld;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
    },
  };

  meta = {
    name: 'palworld',
    labels: {
      app: 'palworld',
    },
    port: {
      game: {
        name: 'game',
        containerPort: 8211,
        servicePort: 8211,
        nodePort: 31001,
        protocol: 'UDP',
      },
      query: {
        name: 'query',
        containerPort: 27015,
        servicePort: 27015,
        nodePort: 31002,
        protocol: 'UDP',
      },
      rcon: {
        name: 'rcon',
        containerPort: 25575,
        servicePort: 25575,
        nodePort: 31003,
        protocol: 'TCP',
      },
    },
    volume: {
      data: {
        containerDirPath: '/palworld',
        hostDirPath: path.join(
          this.globalConfigService.config.terraform.stacks.k8s.workstation
            .common.volumeDirPath.ssdVolume,
          'palworld',
        ),
        volumeName: 'palworld',
      },
    },
  };

  namespace = this.provide(Namespace, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  tmp = [
    // 서버 설정
    // 서버 백업에 사용되는 타임스템프 시간대
    {
      name: 'TZ',
      value: 'Asia/Seoul',
    },
    // 서버에 참여할 수 있는 최대 플레이어 수
    {
      name: 'PLAYERS',
      value: '32',
    },
    // 서버에 사용되는 포트(UDP)
    {
      name: 'PORT',
      value: this.meta.port.game.containerPort.toString(),
    },
    // 서버를 실행할 사용자의 아이디입니다.
    {
      name: 'PUID',
      value: '1000',
    },
    // 서버가 실행해야 하는 그룹의 GID입니다.
    {
      name: 'PGID',
      value: '1000',
    },
    // 멀티 스레드 CPU 환경에서 성능을 향상시킵니다.
    {
      name: 'MULTITHREADING',
      value: 'true',
    },
    // 커뮤니티 서버 탐색기에 서버가 표시되는지 여부
    {
      name: 'COMMUNITY',
      value: 'false',
    },
    // 서버가 실행 중인 네트워크의 PUBLIC IP를 수동으로 지정할 수 있습니다.
    {
      name: 'PUBLIC_IP',
      value:
        this.globalConfigService.config.terraform.stacks.k8s.workstation.common
          .domain.iptime,
    },
    // 서버가 실행 중인 네트워크의 포트 번호를 수동으로 지정할 수 있습니다.
    {
      name: 'PUBLIC_PORT',
      value: this.meta.port.game.nodePort.toString(),
    },
    // 서버 이름
    {
      name: 'SERVER_NAME',
      value: 'ApexCaptain Palworld Server',
    },
    // 서버 설명
    {
      name: 'SERVER_DESCRIPTION',
      value: 'ApexCaptain Palworld Server',
    },
    // 서버 접속을 위한 비밀번호
    {
      name: 'SERVER_PASSWORD',
      value: this.config.serverPassword,
    },
    // 관리자 비밀번호
    {
      name: 'ADMIN_PASSWORD',
      value: this.config.adminPassword,
    },
    // 도커 컨테이너가 시작될 때 서버 업데이트/설치
    {
      name: 'UPDATE_ON_BOOT',
      value: 'true',
    },
    // Palworld RCON 활성화
    {
      name: 'RCON_ENABLED',
      value: 'true',
    },
    // RCON접속 포트
    {
      name: 'RCON_PORT',
      value: this.meta.port.rcon.containerPort.toString(),
    },
    // Steam 서버와 통신하는 데 사용되는 쿼리 포트
    {
      name: 'QUERY_PORT',
      value: this.meta.port.query.containerPort.toString(),
    },
    // 자동 백업 주기
    {
      name: 'BACKUP_CRON_EXPRESSION',
      value: CronTime.everyDayAt(12),
    },
    // 자동 백업을 활성화 여부
    {
      name: 'BACKUP_ENABLED',
      value: 'true',
    },
    // 오래된 백업 파일 자동 삭제 여부
    {
      name: 'DELETE_OLD_BACKUPS',
      value: 'true',
    },
    // 백업 보관 일수
    {
      name: 'OLD_BACKUP_DAYS',
      value: '30',
    },
    // 자동 업데이트 주기
    {
      name: 'AUTO_UPDATE_CRON_EXPRESSION',
      value: CronTime.everyMondayAt(14),
    },
    // 자동 업데이트 활성화 여부
    {
      name: 'AUTO_UPDATE_ENABLED',
      value: 'true',
    },
    // 업데이트 대기 시간 설정(분)
    {
      name: 'AUTO_UPDATE_WARN_MINUTES',
      value: '30',
    },
    // 자동 서버 재부팅 주기
    {
      name: 'AUTO_REBOOT_CRON_EXPRESSION',
      value: CronTime.everyDayAt(5),
    },
    // 자동 서버 재부팅 활성화 여부
    {
      name: 'AUTO_REBOOT_ENABLED',
      value: 'true',
    },
    // 게임의 버젼을 스팀 다운로드 디포의 해당 Manifest ID로 고정.
    // {
    //   name : 'TARGET_MANIFEST_ID'
    // }
    // 디스코드 웹훅 URL
    // {
    //   name: 'DISCORD_WEBHOOK_URL',
    // },
    // 디스코드 명령 초기 연결 시간 초과
    // {
    //   name: 'DISCORD_CONNECT_TIMEOUT',
    // },
    // Discord 총 훅 시간 초과
    // {
    //   name: 'DISCORD_MAX_TIMEOUT',
    // },
    // 서버 업데이트 시작 시 전송되는 디스코드 메시지
    // {
    //   name: 'DISCORD_PRE_UPDATE_BOOT_MESSAGE',
    // },
    // 서버 업데이트 완료 시 전송되는 디스코드 메시지
    // {
    //   name: 'DISCORD_POST_UPDATE_BOOT_MESSAGE',
    // },
    // 서버가 시작될 때 전송되는 디스코드 메시지
    // {
    //   name: 'DISCORD_PRE_START_MESSAGE',
    // },
    // 서버가 종료되기 시작할 때 전송되는 디스코드 메시지
    // {
    //   name: 'DISCORD_PRE_SHUTDOWN_MESSAGE',
    // },
    // 서버가 멈췄을 때 전송되는 디스코드 메시지
    // {
    //   name: 'DISCORD_POST_SHUTDOWN_MESSAGE',
    // },
    // 재부팅 대기 시간 설정(분)
    {
      name: 'AUTO_REBOOT_WARN_MINUTES',
      value: '30',
    },
    // 플레이어 온라인시에도 재부팅
    {
      name: 'AUTO_REBOOT_EVEN_IF_PLAYERS_ONLINE',
      value: 'false',
    },
    // 자동으로 PalWorldSettings.ini를 생성할지 여부
    {
      name: 'DISABLE_GENERATE_SETTINGS',
      value: 'false',
    },
    // 엔진설정의 생성을 비활성화 합니다.ini
    {
      name: 'DISABLE_GENERATE_ENGINE',
      value: 'true',
    },
    // 플레이어가 접속 또는 종료시 로깅과 공지를 활성화
    {
      name: 'ENABLE_PLAYER_LOGGING',
      value: 'true',
    },
    // 플레이어의 접속과 종료를 확인하기위한 폴링시간(초) 설정
    {
      name: 'PLAYER_LOGGING_POLL_PERIOD',
      value: '5',
    },

    // 게임 설정
    // 게임 난이도
    {
      name: 'DIFFICULTY',
      value: 'None',
    },
    // 낮 속도
    {
      name: 'DAYTIME_SPEEDRATE',
      value: '1.0',
    },
    // 밤 속도
    {
      name: 'NIGHTTIME_SPEEDRATE',
      value: '1.0',
    },
    // 경험치 획득 비율
    {
      name: 'EXP_RATE',
      value: '3.0',
    },
    // PAL 포획률
    {
      name: 'PAL_CAPTURE_RATE',
      value: '1.2',
    },
    // PAL 출현 비율
    {
      name: 'PAL_SPAWN_NUM_RATE',
      value: '1.3',
    },
    // PAL이 주는 데미지 배수
    {
      name: 'PAL_DAMAGE_RATE_ATTACK',
      value: '1.0',
    },
    // PAL이 받는 데미지 배수
    {
      name: 'PAL_DAMAGE_RATE_DEFENSE',
      value: '1.0',
    },
    // 플레이어가 주는 데미지 배수
    {
      name: 'PLAYER_DAMAGE_RATE_ATTACK',
      value: '1.0',
    },
    // 플레이어가 받는 데미지 배수
    {
      name: 'PLAYER_DAMAGE_RATE_DEFENSE',
      value: '1.0',
    },
    // 플레이어 포만도 감소율
    {
      name: 'PLAYER_STOMACH_DECREASE_RATE',
      value: '1.0',
    },
    // 플레이어 기력 감소율
    {
      name: 'PLAYER_STAMINA_DECREASE_RATE',
      value: '1.0',
    },
    // 플레이어 HP 자연 회복률
    {
      name: 'PLAYER_AUTO_HP_REGEN_RATE',
      value: '2.0',
    },
    // 플레이어 수면 시 HP 회복률
    {
      name: 'PLAYER_AUTO_HP_REGEN_RATE_IN_SLEEP',
      value: '1.0',
    },
    // PAL 포만도 감소율
    {
      name: 'PAL_STOMACH_DECREASE_RATE',
      value: '0.8',
    },
    // PAL 기력 감소율
    {
      name: 'PAL_STAMINA_DECREASE_RATE',
      value: '1.0',
    },
    // PAL HP 자연 회복률
    {
      name: 'PAL_AUTO_HP_REGEN_RATE',
      value: '2.0',
    },
    // PAL 수면 시 HP 회복률 (PAL상자 내 HP 회복률)
    {
      name: 'PAL_AUTO_HP_REGEN_RATE_IN_SLEEP',
      value: '1.0',
    },
    // 구조물 피해 배수
    {
      name: 'BUILD_OBJECT_DAMAGE_RATE',
      value: '1.0',
    },
    // 구조물 노화 속도 배수
    {
      name: 'BUILD_OBJECT_DETERIORATION_DAMAGE_RATE',
      value: '0.0',
    },
    // 채집 아이템 획득량 배수
    {
      name: 'COLLECTION_DROP_RATE',
      value: '1.8',
    },
    // 채집 오브젝트 HP 배수
    {
      name: 'COLLECTION_OBJECT_HP_RATE',
      value: '1.0',
    },
    // 채집 오브젝트 생성 간격 - 숫자가 작을수록 재 생성이 빨라짐
    {
      name: 'COLLECTION_OBJECT_RESPAWN_SPEED_RATE',
      value: '1.0',
    },
    // 드롭 아이템 양 배수
    {
      name: 'ENEMY_DROP_ITEM_RATE',
      value: '2.0',
    },
    // 사망 패널티
    {
      name: 'DEATH_PENALTY',
      value: 'None',
    },
    // 플레이어간 데미지 여부
    {
      name: 'ENABLE_PLAYER_TO_PLAYER_DAMAGE',
      value: 'false',
    },
    // 아군간 데미지 여부
    {
      name: 'ENABLE_FRIENDLY_FIRE',
      value: 'false',
    },
    // 습격 이벤트 발생 여부
    {
      name: 'ENABLE_INVADER_ENEMY',
      value: 'false',
    },
    // UNKO 활성화 여부
    {
      name: 'ACTIVE_UNKO',
      value: 'false',
    },
    // 컨트롤러 조준 보조 활성화
    {
      name: 'ENABLE_AIM_ASSIST_PAD',
      value: 'true',
    },
    // 키보드 조준 보조 활성화
    {
      name: 'ENABLE_AIM_ASSIST_KEYBOARD',
      value: 'false',
    },
    // 월드 내의 드롭 아이템 최대 수
    {
      name: 'DROP_ITEM_MAX_NUM',
      value: '3000',
    },
    // 월드 내의 UNKO 드롭 최대 수
    {
      name: 'DROP_ITEM_MAX_NUM_UNKO',
      value: '100',
    },
    // 거점 최대 수량
    {
      name: 'BASE_CAMP_MAX_NUM',
      value: '128',
    },
    // 거점 작업 PAL 최대 수
    {
      name: 'BASE_CAMP_WORKER_MAX_NUM',
      value: '15',
    },
    // 드롭 아이템이 사라지기까지 걸리는 시간
    {
      name: 'DROP_ITEM_ALIVE_MAX_HOURS',
      value: '1.0',
    },
    // 온라인 플레이어가 없을 때 길드 자동 리셋 여부
    {
      name: 'AUTO_RESET_GUILD_NO_ONLINE_PLAYERS',
      value: 'false',
    },
    // 온라인 플레이어가 없을 때 길드를 자동 리셋 시간(h)
    {
      name: 'AUTO_RESET_GUILD_TIME_NO_ONLINE_PLAYERS',
      value: '72.0',
    },
    // 길드 내 최대 인원 수
    {
      name: 'GUILD_PLAYER_MAX_NUM',
      value: '20',
    },
    // 거대알 부화에 걸리는 시간(h)
    {
      name: 'PAL_EGG_DEFAULT_HATCHING_TIME',
      value: '72.0',
    },
    // 작업 속도 배수
    {
      name: 'WORK_SPEED_RATE',
      value: '1.2',
    },
    // 멀티플레이 활성화 여부
    {
      name: 'IS_MULTIPLAY',
      value: 'false',
    },
    // PVP 활성화 여부
    {
      name: 'IS_PVP',
      value: 'false',
    },
    // 다른 길드 플레이어의 데스 페널티 드롭 아이템 획득 가능 여부
    {
      name: 'CAN_PICKUP_OTHER_GUILD_DEATH_PENALTY_DROP',
      value: 'false',
    },
    // 비 로그인 패널티 활성화 여부
    {
      name: 'ENABLE_NON_LOGIN_PENALTY',
      value: 'true',
    },
    // 빠른 이동 활성화 여부
    {
      name: 'ENABLE_FAST_TRAVEL',
      value: 'true',
    },
    // 시작 위치를 지도로 선택할 수 있는지 여부
    {
      name: 'IS_START_LOCATION_SELECT_BY_MAP',
      value: 'true',
    },
    // 로그오프 후 플레이어 삭제 여부
    {
      name: 'EXIST_PLAYER_AFTER_LOGOUT',
      value: 'false',
    },
    // 다른 길드 플레이어에 대한 방어 허용 여부
    {
      name: 'ENABLE_DEFENSE_OTHER_GUILD_PLAYER',
      value: 'false',
    },
    // 협동던전 최대인원
    {
      name: 'COOP_PLAYER_MAX_NUM',
      value: '4',
    },
    // {
    //   name : 'REGION'
    // },
    // 인증 사용 여부
    {
      name: 'USEAUTH',
      value: 'true',
    },
    // 사용할 BAN 목록
    // {
    //   name: 'BAN_LIST_URL',
    //   value: 'https://api.palworldgame.com/api/banlist.txt',
    // },
    // ESC시 사용자 리스트
    {
      name: 'SHOW_PLAYER_LIST',
      value: 'true',
    },
  ];

  // deployment = this.provide(Deployment, 'deployment', () => ({
  //   metadata: {
  //     name: this.meta.name,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     replicas: '1',
  //     selector: {
  //       matchLabels: this.meta.labels,
  //     },
  //     template: {
  //       metadata: {
  //         labels: this.meta.labels,
  //       },
  //       spec: {
  //         container: [
  //           {
  //             name: this.meta.name,
  //             image: 'thijsvanloef/palworld-server-docker',
  //             imagePullPolicy: 'Always',
  //             port: [this.meta.port.game].map(
  //               ({ containerPort, protocol }) => ({
  //                 containerPort,
  //                 protocol,
  //               }),
  //             ),
  //             env: [
  //               // 서버 설정
  //               // 서버 백업에 사용되는 타임스템프 시간대
  //               {
  //                 name: 'TZ',
  //                 value: 'Asia/Seoul',
  //               },
  //               // 서버에 참여할 수 있는 최대 플레이어 수
  //               {
  //                 name: 'PLAYERS',
  //                 value: '32',
  //               },
  //               // 서버에 사용되는 포트(UDP)
  //               {
  //                 name: 'PORT',
  //                 value: this.meta.port.game.containerPort.toString(),
  //               },
  //               // 서버를 실행할 사용자의 아이디입니다.
  //               {
  //                 name: 'PUID',
  //                 value: '1000',
  //               },
  //               // 서버가 실행해야 하는 그룹의 GID입니다.
  //               {
  //                 name: 'PGID',
  //                 value: '1000',
  //               },
  //               // 멀티 스레드 CPU 환경에서 성능을 향상시킵니다.
  //               {
  //                 name: 'MULTITHREADING',
  //                 value: 'true',
  //               },
  //               // 커뮤니티 서버 탐색기에 서버가 표시되는지 여부
  //               {
  //                 name: 'COMMUNITY',
  //                 value: 'false',
  //               },
  //               // 서버가 실행 중인 네트워크의 PUBLIC IP를 수동으로 지정할 수 있습니다.
  //               {
  //                 name: 'PUBLIC_IP',
  //                 value:
  //                   this.globalConfigService.config.terraform.stacks.k8s
  //                     .workstation.common.domain.iptime,
  //               },
  //               // 서버가 실행 중인 네트워크의 포트 번호를 수동으로 지정할 수 있습니다.
  //               {
  //                 name: 'PUBLIC_PORT',
  //                 value: this.meta.port.game.nodePort.toString(),
  //               },
  //               // 서버 이름
  //               {
  //                 name: 'SERVER_NAME',
  //                 value: 'ApexCaptain Palworld Server',
  //               },
  //               // 서버 설명
  //               {
  //                 name: 'SERVER_DESCRIPTION',
  //                 value: 'ApexCaptain Palworld Server',
  //               },
  //               // 서버 접속을 위한 비밀번호
  //               {
  //                 name: 'SERVER_PASSWORD',
  //                 value: this.config.serverPassword,
  //               },
  //               // 관리자 비밀번호
  //               {
  //                 name: 'ADMIN_PASSWORD',
  //                 value: this.config.adminPassword,
  //               },
  //               // 도커 컨테이너가 시작될 때 서버 업데이트/설치
  //               {
  //                 name: 'UPDATE_ON_BOOT',
  //                 value: 'true',
  //               },
  //               // Palworld RCON 활성화
  //               {
  //                 name: 'RCON_ENABLED',
  //                 value: 'true',
  //               },
  //               // RCON접속 포트
  //               {
  //                 name: 'RCON_PORT',
  //                 value: this.meta.port.rcon.containerPort.toString(),
  //               },
  //               // Steam 서버와 통신하는 데 사용되는 쿼리 포트
  //               {
  //                 name: 'QUERY_PORT',
  //                 value: this.meta.port.query.containerPort.toString(),
  //               },
  //               // 자동 백업 주기
  //               {
  //                 name: 'BACKUP_CRON_EXPRESSION',
  //                 value: CronTime.everyDayAt(12),
  //               },
  //               // 자동 백업을 활성화 여부
  //               {
  //                 name: 'BACKUP_ENABLED',
  //                 value: 'true',
  //               },
  //               // 오래된 백업 파일 자동 삭제 여부
  //               {
  //                 name: 'DELETE_OLD_BACKUPS',
  //                 value: 'true',
  //               },
  //               // 백업 보관 일수
  //               {
  //                 name: 'OLD_BACKUP_DAYS',
  //                 value: '30',
  //               },
  //               // 자동 업데이트 주기
  //               {
  //                 name: 'AUTO_UPDATE_CRON_EXPRESSION',
  //                 value: CronTime.everyMondayAt(14),
  //               },
  //               // 자동 업데이트 활성화 여부
  //               {
  //                 name: 'AUTO_UPDATE_ENABLED',
  //                 value: 'true',
  //               },
  //               // 업데이트 대기 시간 설정(분)
  //               {
  //                 name: 'AUTO_UPDATE_WARN_MINUTES',
  //                 value: '30',
  //               },
  //               // 자동 서버 재부팅 주기
  //               {
  //                 name: 'AUTO_REBOOT_CRON_EXPRESSION',
  //                 value: CronTime.everyDayAt(5),
  //               },
  //               // 자동 서버 재부팅 활성화 여부
  //               {
  //                 name: 'AUTO_REBOOT_ENABLED',
  //                 value: 'true',
  //               },
  //               // 게임의 버젼을 스팀 다운로드 디포의 해당 Manifest ID로 고정.
  //               // {
  //               //   name : 'TARGET_MANIFEST_ID'
  //               // }
  //               // 디스코드 웹훅 URL
  //               // {
  //               //   name: 'DISCORD_WEBHOOK_URL',
  //               // },
  //               // 디스코드 명령 초기 연결 시간 초과
  //               // {
  //               //   name: 'DISCORD_CONNECT_TIMEOUT',
  //               // },
  //               // Discord 총 훅 시간 초과
  //               // {
  //               //   name: 'DISCORD_MAX_TIMEOUT',
  //               // },
  //               // 서버 업데이트 시작 시 전송되는 디스코드 메시지
  //               // {
  //               //   name: 'DISCORD_PRE_UPDATE_BOOT_MESSAGE',
  //               // },
  //               // 서버 업데이트 완료 시 전송되는 디스코드 메시지
  //               // {
  //               //   name: 'DISCORD_POST_UPDATE_BOOT_MESSAGE',
  //               // },
  //               // 서버가 시작될 때 전송되는 디스코드 메시지
  //               // {
  //               //   name: 'DISCORD_PRE_START_MESSAGE',
  //               // },
  //               // 서버가 종료되기 시작할 때 전송되는 디스코드 메시지
  //               // {
  //               //   name: 'DISCORD_PRE_SHUTDOWN_MESSAGE',
  //               // },
  //               // 서버가 멈췄을 때 전송되는 디스코드 메시지
  //               // {
  //               //   name: 'DISCORD_POST_SHUTDOWN_MESSAGE',
  //               // },
  //               // 재부팅 대기 시간 설정(분)
  //               {
  //                 name: 'AUTO_REBOOT_WARN_MINUTES',
  //                 value: '30',
  //               },
  //               // 플레이어 온라인시에도 재부팅
  //               {
  //                 name: 'AUTO_REBOOT_EVEN_IF_PLAYERS_ONLINE',
  //                 value: 'false',
  //               },
  //               // 자동으로 PalWorldSettings.ini를 생성할지 여부
  //               {
  //                 name: 'DISABLE_GENERATE_SETTINGS',
  //                 value: 'false',
  //               },
  //               // 엔진설정의 생성을 비활성화 합니다.ini
  //               {
  //                 name: 'DISABLE_GENERATE_ENGINE',
  //                 value: 'true',
  //               },
  //               // 플레이어가 접속 또는 종료시 로깅과 공지를 활성화
  //               {
  //                 name: 'ENABLE_PLAYER_LOGGING',
  //                 value: 'true',
  //               },
  //               // 플레이어의 접속과 종료를 확인하기위한 폴링시간(초) 설정
  //               {
  //                 name: 'PLAYER_LOGGING_POLL_PERIOD',
  //                 value: '5',
  //               },

  //               // 게임 설정
  //               // 게임 난이도
  //               {
  //                 name: 'DIFFICULTY',
  //                 value: 'None',
  //               },
  //               // 낮 속도
  //               {
  //                 name: 'DAYTIME_SPEEDRATE',
  //                 value: '1.0',
  //               },
  //               // 밤 속도
  //               {
  //                 name: 'NIGHTTIME_SPEEDRATE',
  //                 value: '1.0',
  //               },
  //               // 경험치 획득 비율
  //               {
  //                 name: 'EXP_RATE',
  //                 value: '3.0',
  //               },
  //               // PAL 포획률
  //               {
  //                 name: 'PAL_CAPTURE_RATE',
  //                 value: '1.2',
  //               },
  //               // PAL 출현 비율
  //               {
  //                 name: 'PAL_SPAWN_NUM_RATE',
  //                 value: '1.3',
  //               },
  //               // PAL이 주는 데미지 배수
  //               {
  //                 name: 'PAL_DAMAGE_RATE_ATTACK',
  //                 value: '1.0',
  //               },
  //               // PAL이 받는 데미지 배수
  //               {
  //                 name: 'PAL_DAMAGE_RATE_DEFENSE',
  //                 value: '1.0',
  //               },
  //               // 플레이어가 주는 데미지 배수
  //               {
  //                 name: 'PLAYER_DAMAGE_RATE_ATTACK',
  //                 value: '1.0',
  //               },
  //               // 플레이어가 받는 데미지 배수
  //               {
  //                 name: 'PLAYER_DAMAGE_RATE_DEFENSE',
  //                 value: '1.0',
  //               },
  //               // 플레이어 포만도 감소율
  //               {
  //                 name: 'PLAYER_STOMACH_DECREASE_RATE',
  //                 value: '1.0',
  //               },
  //               // 플레이어 기력 감소율
  //               {
  //                 name: 'PLAYER_STAMINA_DECREASE_RATE',
  //                 value: '1.0',
  //               },
  //               // 플레이어 HP 자연 회복률
  //               {
  //                 name: 'PLAYER_AUTO_HP_REGEN_RATE',
  //                 value: '2.0',
  //               },
  //               // 플레이어 수면 시 HP 회복률
  //               {
  //                 name: 'PLAYER_AUTO_HP_REGEN_RATE_IN_SLEEP',
  //                 value: '1.0',
  //               },
  //               // PAL 포만도 감소율
  //               {
  //                 name: 'PAL_STOMACH_DECREASE_RATE',
  //                 value: '0.8',
  //               },
  //               // PAL 기력 감소율
  //               {
  //                 name: 'PAL_STAMINA_DECREASE_RATE',
  //                 value: '1.0',
  //               },
  //               // PAL HP 자연 회복률
  //               {
  //                 name: 'PAL_AUTO_HP_REGEN_RATE',
  //                 value: '2.0',
  //               },
  //               // PAL 수면 시 HP 회복률 (PAL상자 내 HP 회복률)
  //               {
  //                 name: 'PAL_AUTO_HP_REGEN_RATE_IN_SLEEP',
  //                 value: '1.0',
  //               },
  //               // 구조물 피해 배수
  //               {
  //                 name: 'BUILD_OBJECT_DAMAGE_RATE',
  //                 value: '1.0',
  //               },
  //               // 구조물 노화 속도 배수
  //               {
  //                 name: 'BUILD_OBJECT_DETERIORATION_DAMAGE_RATE',
  //                 value: '0.0',
  //               },
  //               // 채집 아이템 획득량 배수
  //               {
  //                 name: 'COLLECTION_DROP_RATE',
  //                 value: '1.8',
  //               },
  //               // 채집 오브젝트 HP 배수
  //               {
  //                 name: 'COLLECTION_OBJECT_HP_RATE',
  //                 value: '1.0',
  //               },
  //               // 채집 오브젝트 생성 간격 - 숫자가 작을수록 재 생성이 빨라짐
  //               {
  //                 name: 'COLLECTION_OBJECT_RESPAWN_SPEED_RATE',
  //                 value: '1.0',
  //               },
  //               // 드롭 아이템 양 배수
  //               {
  //                 name: 'ENEMY_DROP_ITEM_RATE',
  //                 value: '2.0',
  //               },
  //               // 사망 패널티
  //               {
  //                 name: 'DEATH_PENALTY',
  //                 value: 'None',
  //               },
  //               // 플레이어간 데미지 여부
  //               {
  //                 name: 'ENABLE_PLAYER_TO_PLAYER_DAMAGE',
  //                 value: 'false',
  //               },
  //               // 아군간 데미지 여부
  //               {
  //                 name: 'ENABLE_FRIENDLY_FIRE',
  //                 value: 'false',
  //               },
  //               // 습격 이벤트 발생 여부
  //               {
  //                 name: 'ENABLE_INVADER_ENEMY',
  //                 value: 'false',
  //               },
  //               // UNKO 활성화 여부
  //               {
  //                 name: 'ACTIVE_UNKO',
  //                 value: 'false',
  //               },
  //               // 컨트롤러 조준 보조 활성화
  //               {
  //                 name: 'ENABLE_AIM_ASSIST_PAD',
  //                 value: 'true',
  //               },
  //               // 키보드 조준 보조 활성화
  //               {
  //                 name: 'ENABLE_AIM_ASSIST_KEYBOARD',
  //                 value: 'false',
  //               },
  //               // 월드 내의 드롭 아이템 최대 수
  //               {
  //                 name: 'DROP_ITEM_MAX_NUM',
  //                 value: '3000',
  //               },
  //               // 월드 내의 UNKO 드롭 최대 수
  //               {
  //                 name: 'DROP_ITEM_MAX_NUM_UNKO',
  //                 value: '100',
  //               },
  //               // 거점 최대 수량
  //               {
  //                 name: 'BASE_CAMP_MAX_NUM',
  //                 value: '128',
  //               },
  //               // 거점 작업 PAL 최대 수
  //               {
  //                 name: 'BASE_CAMP_WORKER_MAX_NUM',
  //                 value: '15',
  //               },
  //               // 드롭 아이템이 사라지기까지 걸리는 시간
  //               {
  //                 name: 'DROP_ITEM_ALIVE_MAX_HOURS',
  //                 value: '1.0',
  //               },
  //               // 온라인 플레이어가 없을 때 길드 자동 리셋 여부
  //               {
  //                 name: 'AUTO_RESET_GUILD_NO_ONLINE_PLAYERS',
  //                 value: 'false',
  //               },
  //               // 온라인 플레이어가 없을 때 길드를 자동 리셋 시간(h)
  //               {
  //                 name: 'AUTO_RESET_GUILD_TIME_NO_ONLINE_PLAYERS',
  //                 value: '72.0',
  //               },
  //               // 길드 내 최대 인원 수
  //               {
  //                 name: 'GUILD_PLAYER_MAX_NUM',
  //                 value: '20',
  //               },
  //               // 거대알 부화에 걸리는 시간(h)
  //               {
  //                 name: 'PAL_EGG_DEFAULT_HATCHING_TIME',
  //                 value: '72.0',
  //               },
  //               // 작업 속도 배수
  //               {
  //                 name: 'WORK_SPEED_RATE',
  //                 value: '1.2',
  //               },
  //               // 멀티플레이 활성화 여부
  //               {
  //                 name: 'IS_MULTIPLAY',
  //                 value: 'false',
  //               },
  //               // PVP 활성화 여부
  //               {
  //                 name: 'IS_PVP',
  //                 value: 'false',
  //               },
  //               // 다른 길드 플레이어의 데스 페널티 드롭 아이템 획득 가능 여부
  //               {
  //                 name: 'CAN_PICKUP_OTHER_GUILD_DEATH_PENALTY_DROP',
  //                 value: 'false',
  //               },
  //               // 비 로그인 패널티 활성화 여부
  //               {
  //                 name: 'ENABLE_NON_LOGIN_PENALTY',
  //                 value: 'true',
  //               },
  //               // 빠른 이동 활성화 여부
  //               {
  //                 name: 'ENABLE_FAST_TRAVEL',
  //                 value: 'true',
  //               },
  //               // 시작 위치를 지도로 선택할 수 있는지 여부
  //               {
  //                 name: 'IS_START_LOCATION_SELECT_BY_MAP',
  //                 value: 'true',
  //               },
  //               // 로그오프 후 플레이어 삭제 여부
  //               {
  //                 name: 'EXIST_PLAYER_AFTER_LOGOUT',
  //                 value: 'false',
  //               },
  //               // 다른 길드 플레이어에 대한 방어 허용 여부
  //               {
  //                 name: 'ENABLE_DEFENSE_OTHER_GUILD_PLAYER',
  //                 value: 'false',
  //               },
  //               // 협동던전 최대인원
  //               {
  //                 name: 'COOP_PLAYER_MAX_NUM',
  //                 value: '4',
  //               },
  //               // {
  //               //   name : 'REGION'
  //               // },
  //               // 인증 사용 여부
  //               {
  //                 name: 'USEAUTH',
  //                 value: 'true',
  //               },
  //               // 사용할 BAN 목록
  //               // {
  //               //   name: 'BAN_LIST_URL',
  //               //   value: 'https://api.palworldgame.com/api/banlist.txt',
  //               // },
  //               // ESC시 사용자 리스트
  //               {
  //                 name: 'SHOW_PLAYER_LIST',
  //                 value: 'true',
  //               },
  //             ],
  //             volumeMount: [
  //               {
  //                 name: this.meta.volume.data.volumeName,
  //                 mountPath: this.meta.volume.data.containerDirPath,
  //               },
  //             ],
  //           },
  //         ],
  //         volume: [
  //           {
  //             name: this.meta.volume.data.volumeName,
  //             hostPath: {
  //               type: 'DirectoryOrCreate',
  //               path: this.meta.volume.data.hostDirPath,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   },
  // }));

  // service = this.provide(Service, 'service', id => ({
  //   metadata: {
  //     name: _.kebabCase(`${this.meta.name}-${id}`),
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     type: 'NodePort',
  //     selector: this.meta.labels,
  //     port: [this.meta.port.game].map(port => ({
  //       name: port.name,
  //       port: port.servicePort,
  //       targetPort: port.containerPort.toString(),
  //       nodePort: port.nodePort,
  //       protocol: port.protocol,
  //     })),
  //   },
  // }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Palworld_Stack.name,
      'Palworld stack for workstation k8s',
    );
  }
}
