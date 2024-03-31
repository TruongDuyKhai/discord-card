import { Component, OnInit } from '@angular/core';
import { DiscordApiService } from 'src/app/services/discord-api.service';
import { Profile } from 'src/app/models/discord-profile.model';
import { LanyardService } from 'src/app/services/lanyard.service';
import { Lanyard, Activity } from 'src/app/models/lanyard-profile.model';
import { environment } from 'src/environments/environment';
import { SpotifyService } from 'src/app/services/spotify.service';

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
  userId = environment.discordId;
  userDataStatus = false;
  userData?: Profile;
  userBioFormatted?: string;
  themesColor: string[] = [];

  message = '';
  lanyardData!: Lanyard | null;
  lanyardActivities: Activity[] = [];

  constructor(private spotifyService: SpotifyService, private discordApiService: DiscordApiService, private lanyardService: LanyardService) { }

  ngOnInit(): void {
    this.getDiscordUserData();

    this.getLanyardData();

    this.spotifyService.loadSpotifyApi();
  }

  public getDiscordUserData(): void {
    this.discordApiService.getDiscordUser(this.userId).subscribe({
      next: (data: Profile) => {
        this.userDataStatus = true;
        this.userData = data;

        // Change all the /n to <br>
        this.userBioFormatted = this.userData.user_profile?.bio?.replace(/\n/g, '<br>');

        const themeColors = this.userData.user_profile?.theme_colors || [];
        if (themeColors.length === 0) {
          this.themesColor = ['#5C5C5C', '#5C5C5C'];
        } else {
          // Convert the decimal color to hex
          this.themesColor = themeColors.map((color) => {
            return '#' + color.toString(16).padStart(6, '0').toUpperCase();
          });
        }
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
        // Format the timestamps of the activities
        this.lanyardActivities.forEach((activity) => {
          if (activity.timestamps) {
            const { start } = activity.timestamps;
            if (start) {
              const startTime = new Date(start);

              if(!this.lanyardActivities.find(e => e.name == 'Spotify')) {
                this.spotifyService.destroy();
              }
              
              // Function to update time ago message
              const updateAgoMessage = () => {
                const currentTime = new Date();
                const timeDifference = currentTime.getTime() - startTime.getTime();
                if(activity.name == 'Spotify') {
                  this.spotifyService.update(`spotify:track:${activity.sync_id}`);
                  if(Math.abs(timeDifference - this.spotifyService.position) > 1500) {
                    this.spotifyService.seek(timeDifference / 1000);
                  }
                }
                
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
          }
        });
      },
      error: (error) => {
        console.log(error);
      },
    });
  }

  getActivityImageUrl(activity: Activity, asset?: string): string {
    if(activity.id === 'custom') {
      if(activity.emoji?.id) {
        return `https://cdn.discordapp.com/emojis/${activity.emoji.id}.${activity.emoji.animated ? 'gif' : 'png'}`;
      } else return `https://nyxcodeapi.onrender.com/discord/info/avatar/${this.userId}`;
    } else if (asset && asset.startsWith('spotify:')) {
      const parts = asset.split(':');
      return `https://i.scdn.co/image/${parts[1]}`;
    } else if(asset && asset.search('https/') !== -1){
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
