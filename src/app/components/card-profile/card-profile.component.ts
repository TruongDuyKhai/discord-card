import { Component, OnInit } from '@angular/core';
import { DiscordApiService } from 'src/app/services/discord-api.service';
import { Profile } from 'src/app/models/discord-profile.model';
import { LanyardService } from 'src/app/services/lanyard.service';
import { Lanyard, Activity } from 'src/app/models/lanyard-profile.model';
import { environment } from 'src/environments/environment';

declare global {
  interface Window {
    loadAtropos(): void;
  }
}

@Component({
  selector: 'app-card-profile',
  templateUrl: './card-profile.component.html',
  styleUrls: ['./card-profile.component.scss']
})
export class CardProfileComponent implements OnInit {

  intervals: Array<any> = [];
  environment = environment;
  userId = environment.discordId;
  userDataStatus = false;
  userData?: Profile;
  userBioFormatted?: string;
  themesColor: string[] = [];
  avatarDecorationAsset: string = '';
  parseInt = parseInt;
  isImage = function isImage(url: string): Boolean {
    const img = new Image();
    var res = false;
    img.onload = () => res = true;
    img.src = url;
    return res;
  };

  banner: string = '';
  
  message = '';
  lanyardData!: Lanyard | null;
  lanyardActivities: Activity[] = [];
  statusColor: string = '#43b581';

  constructor(private discordApiService: DiscordApiService, private lanyardService: LanyardService) { }

  ngOnInit(): void {
    this.getDiscordUserData();

    this.getLanyardData();

    setInterval(() => {
      const profileEffectIntro = document.getElementById('profileEffectIntro');
      if (profileEffectIntro) {
        profileEffectIntro.setAttribute('src', '');
        profileEffectIntro.setAttribute('src', environment.profile_effect.intro);
      }
    }, 60000);
  }

  public getDiscordUserData(): void {
    this.discordApiService.getDiscordUser(this.userId).subscribe({
      next: (data: Profile) => {
        this.userDataStatus = true;
        this.userData = data;

        // Change all the /n to <br>
        this.userBioFormatted = this.userData.user_profile?.bio?.replace(/\n/g, '<br>');

        this.themesColor = this.userData.user_profile?.theme_colors?.map(e => `#${e.toString(16).padStart(6, '0')}`) || environment.theme_colors;

        this.avatarDecorationAsset = this.userData.user?.avatar_decoration_data?.asset || environment.avatar_decoration;

        this.banner = `url(${this.userData.user?.banner ? `https://cdn.discordapp.com/banners/${this.userId}/${this.userData.user.banner}?size=2048` : environment.banner})`;
      },
      error: (error) => {
        this.userDataStatus = false;
        console.log(error);
      }
    }).add(() => {
      window.loadAtropos();
    });
  }

  public getLanyardData(): void {
    this.lanyardService.setupWebSocket();

    this.lanyardService.getLanyardData().subscribe({
      next: (data) => {
        this.lanyardData = data;

        this.lanyardActivities = this.lanyardData.d?.activities || [];

        this.intervals.forEach((interval) => {
          clearInterval(interval);
        });

        // Get the status color to apply to the platform svg
        switch (this.lanyardData.d?.discord_status) {
          case 'online':
            this.statusColor = '#43b581';
            break;
          case 'idle':
            this.statusColor = '#faa61a';
            break;
          case 'dnd':
            this.statusColor = '#f04747';
            break;
          case 'offline':
            this.statusColor = '#747f8d';
            break;
          case 'streaming':
            this.statusColor = '#593695';
            break;
          case 'invisible':
            this.statusColor = '#747f8d';
            break;
          case 'unknown':
            this.statusColor = '#747f8d';
            break;
          default:
            this.statusColor = '#747f8d';
            break;
        }

        // Format the timestamps of the activities
        this.lanyardActivities.forEach((activity) => {
          if (activity.timestamps) {
            const { start } = activity.timestamps;
            const startTime = new Date(start);

            // Function to update time ago message
            const updateAgoMessage = () => {
              const currentTime = new Date();
              const timeDifference = currentTime.getTime() - startTime.getTime();

              const hours = Math.floor(timeDifference / (1000 * 60 * 60));
              let minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
              let seconds = Math.floor((timeDifference % (1000 * 60)) / 1000); // Remove secondsPassed, calculate directly

              let timeAgoMessage = '';

              // If seconds exceed 60, increase minutes accordingly
              if (seconds >= 60) {
                seconds = seconds % 60; // Reset seconds
                const extraMinutes = Math.floor(seconds / 60); // Calculate extra minutes
                minutes += extraMinutes; // Increase minutes
              }

              if (hours > 0) {
                timeAgoMessage += `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
              }

              if (minutes > 0) {
                timeAgoMessage += `${timeAgoMessage ? ' : ' : ''}${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
              }

              if (seconds > 0) {
                timeAgoMessage += `${timeAgoMessage ? ' : ' : ''}${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
              }

              return timeAgoMessage;
            };

            activity.timestamps.start = updateAgoMessage() || '';

            // Call updateAgoMessage() every second
            this.intervals.push(setInterval(() => {
              if (activity.timestamps) {
                activity.timestamps.start = updateAgoMessage() || '';
              }
            }, 1000));
          }
        });
      },
      error: (error) => {
        console.log(error);
      },
    });
  }

  getActivityImageUrl(activity: Activity, asset?: string): string {
    if (activity.id === 'custom') {
      if (activity.emoji?.id) {
        return `https://cdn.discordapp.com/emojis/${activity.emoji.id}.${activity.emoji.animated ? 'gif' : 'png'}`;
      } else return `https://khaidevapi.onrender.com/discord/data/avatar/${this.userId}`;
    } else if (asset && asset.startsWith('spotify:')) {
      const parts = asset.split(':');
      return `https://i.scdn.co/image/${parts[1]}`;
    } else if (asset && asset.search('https/') !== -1) {
      const parts = asset.split('https/');
      return `https://${parts[1]}`;
    } else {
      return `https://dcdn.dstn.to/app-icons/${activity.application_id}.png`
    }
  }

  public sendMessage(): void {
    window.open(`https://discord.com/users/${this.userId}`, '_blank');

    this.message = '';
  }

  handleImageError(event: any) {
    event.target.src = '../../../assets/images/no-image-found.jpg';
  }
}
