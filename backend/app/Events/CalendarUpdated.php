<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CalendarUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $scope;
    public string $date;
    public array $dayConfig;

    /**
     * Create a new event instance.
     */
    public function __construct(string $scope, string $date, array $dayConfig)
    {
        $this->scope = $scope;
        $this->date = $date;
        $this->dayConfig = $dayConfig;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("{$this->scope}.calendar"),
        ];
    }
    
    public function broadcastAs(): string
    {
        return 'CalendarUpdated';
    }
}
