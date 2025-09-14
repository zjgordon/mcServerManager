"""
Server file test fixtures.

This module provides fixtures for creating realistic Minecraft server files
and directories for testing purposes.
"""
import os
import shutil
import tempfile
from pathlib import Path

import pytest


@pytest.fixture
def mock_server_jar():
    """Create a mock server.jar file with realistic content."""
    with tempfile.NamedTemporaryFile(suffix=".jar", delete=False) as f:
        # Create a minimal JAR-like content (just for testing)
        jar_content = b"PK\x03\x04\x14\x00\x00\x00\x08\x00" + b"Minecraft Server Mock" * 100
        f.write(jar_content)
        return f.name


@pytest.fixture
def mock_eula_content():
    """Return mock EULA content."""
    return "#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://account.mojang.com/documents/minecraft_eula).\n#Wed Jan 01 00:00:00 UTC 2025\neula=true\n"


@pytest.fixture
def mock_server_properties():
    """Return mock server.properties content."""
    return """#Minecraft server properties
#Wed Jan 01 00:00:00 UTC 2025
generator-settings=
op-permission-level=4
allow-nether=true
level-name=world
enable-query=false
allow-flight=false
announce-player-achievements=true
server-port=25565
max-world-size=29999984
level-type=DEFAULT
enable-rcon=false
level-seed=
force-gamemode=false
server-ip=
network-compression-threshold=256
max-build-height=256
spawn-npcs=true
white-list=false
spawn-animals=true
hardcore=false
snooper-enabled=true
resource-pack-sha1=
online-mode=true
resource-pack=
pvp=true
difficulty=1
enable-command-block=false
gamemode=0
player-idle-timeout=0
max-players=20
max-tick-time=60000
spawn-monsters=true
view-distance=10
generate-structures=true
motd=A Minecraft Server
"""


@pytest.fixture
def mock_world_files():
    """Create mock world files and directories."""
    with tempfile.TemporaryDirectory() as temp_dir:
        world_dir = os.path.join(temp_dir, "world")
        os.makedirs(world_dir, exist_ok=True)

        # Create essential world directories
        region_dir = os.path.join(world_dir, "region")
        data_dir = os.path.join(world_dir, "data")
        datapacks_dir = os.path.join(world_dir, "datapacks")
        stats_dir = os.path.join(world_dir, "stats")

        for dir_path in [region_dir, data_dir, datapacks_dir, stats_dir]:
            os.makedirs(dir_path, exist_ok=True)

        # Create level.dat
        level_dat_content = b"Mock level.dat content for testing"
        with open(os.path.join(world_dir, "level.dat"), "wb") as f:
            f.write(level_dat_content)

        # Create session.lock
        with open(os.path.join(world_dir, "session.lock"), "w") as f:
            f.write("0")

        # Create some region files
        for x in range(-1, 2):
            for z in range(-1, 2):
                region_file = os.path.join(region_dir, f"r.{x}.{z}.mca")
                with open(region_file, "wb") as f:
                    f.write(b"Mock region data " + f"region_{x}_{z}".encode())

        # Create some data files
        data_files = ["scoreboard.dat", "villages.dat", "map_0.dat", "raids.dat"]

        for data_file in data_files:
            with open(os.path.join(data_dir, data_file), "wb") as f:
                f.write(f"Mock {data_file} content".encode())

        # Create a simple datapack
        test_pack_dir = os.path.join(datapacks_dir, "test_pack")
        os.makedirs(test_pack_dir, exist_ok=True)

        with open(os.path.join(test_pack_dir, "pack.mcmeta"), "w") as f:
            f.write('{"pack": {"pack_format": 7, "description": "Test datapack"}}')

        # Create stats directory with some files
        stats_files = [
            "stats/00000000-0000-0000-0000-000000000000.json",
            "stats/11111111-1111-1111-1111-111111111111.json",
        ]

        for stats_file in stats_files:
            stats_path = os.path.join(world_dir, stats_file)
            os.makedirs(os.path.dirname(stats_path), exist_ok=True)
            with open(stats_path, "w") as f:
                f.write('{"stats": {"minecraft:custom": {"minecraft:play_time": 3600}}}')

        yield temp_dir


@pytest.fixture
def complete_server_directory(
    mock_server_jar, mock_eula_content, mock_server_properties, mock_world_files
):
    """Create a complete server directory with all necessary files."""
    # Copy world files to a new temp directory
    server_dir = tempfile.mkdtemp()

    try:
        # Copy world directory
        world_source = mock_world_files
        world_dest = os.path.join(server_dir, "world")
        shutil.copytree(os.path.join(world_source, "world"), world_dest)

        # Copy server.jar
        server_jar_dest = os.path.join(server_dir, "server.jar")
        shutil.copy2(mock_server_jar, server_jar_dest)

        # Create eula.txt
        with open(os.path.join(server_dir, "eula.txt"), "w") as f:
            f.write(mock_eula_content)

        # Create server.properties
        with open(os.path.join(server_dir, "server.properties"), "w") as f:
            f.write(mock_server_properties)

        # Create additional common files
        with open(os.path.join(server_dir, "usercache.json"), "w") as f:
            f.write("[]")

        with open(os.path.join(server_dir, "whitelist.json"), "w") as f:
            f.write("[]")

        with open(os.path.join(server_dir, "banned-players.json"), "w") as f:
            f.write("[]")

        with open(os.path.join(server_dir, "banned-ips.json"), "w") as f:
            f.write("[]")

        with open(os.path.join(server_dir, "ops.json"), "w") as f:
            f.write("[]")

        # Create logs directory
        logs_dir = os.path.join(server_dir, "logs")
        os.makedirs(logs_dir, exist_ok=True)

        with open(os.path.join(logs_dir, "latest.log"), "w") as f:
            f.write("[00:00:00] [Server thread/INFO]: Starting minecraft server version 1.20.1\n")
            f.write("[00:00:00] [Server thread/INFO]: Loading properties\n")
            f.write("[00:00:00] [Server thread/INFO]: Default game type: SURVIVAL\n")

        yield server_dir

    finally:
        # Cleanup
        shutil.rmtree(server_dir, ignore_errors=True)
        os.unlink(mock_server_jar)


@pytest.fixture
def minimal_server_directory():
    """Create a minimal server directory with only essential files."""
    server_dir = tempfile.mkdtemp()

    try:
        # Create minimal server.jar
        with open(os.path.join(server_dir, "server.jar"), "wb") as f:
            f.write(b"Mock minimal server jar")

        # Create eula.txt
        with open(os.path.join(server_dir, "eula.txt"), "w") as f:
            f.write("eula=true\n")

        # Create server.properties
        with open(os.path.join(server_dir, "server.properties"), "w") as f:
            f.write("server-port=25565\nmotd=Test Server\n")

        # Create minimal world structure
        world_dir = os.path.join(server_dir, "world")
        os.makedirs(world_dir, exist_ok=True)

        with open(os.path.join(world_dir, "level.dat"), "wb") as f:
            f.write(b"Minimal level data")

        os.makedirs(os.path.join(world_dir, "region"), exist_ok=True)
        os.makedirs(os.path.join(world_dir, "data"), exist_ok=True)

        yield server_dir

    finally:
        shutil.rmtree(server_dir, ignore_errors=True)


@pytest.fixture
def corrupted_server_directory():
    """Create a server directory with corrupted/missing files."""
    server_dir = tempfile.mkdtemp()

    try:
        # Create corrupted server.jar (empty)
        with open(os.path.join(server_dir, "server.jar"), "w"):
            pass  # Empty file

        # Missing eula.txt
        # Missing server.properties

        # Create corrupted world
        world_dir = os.path.join(server_dir, "world")
        os.makedirs(world_dir, exist_ok=True)

        # Corrupted level.dat (empty)
        with open(os.path.join(world_dir, "level.dat"), "w"):
            pass  # Empty file

        # Missing region and data directories

        yield server_dir

    finally:
        shutil.rmtree(server_dir, ignore_errors=True)
